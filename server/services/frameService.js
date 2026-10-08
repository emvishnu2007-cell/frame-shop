'use strict';
const crypto = require('crypto');
const db = require('../db');
const AppError = require('../utils/AppError');
const { deleteUploadQuietly } = require('../utils/helpers');

function hydrate(rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const marks = ids.map(() => '?').join(',');
  const images = db.prepare(`SELECT * FROM frame_images WHERE frame_id IN (${marks}) ORDER BY sort_order, id`).all(...ids);
  const sizes = db.prepare(`SELECT * FROM frame_sizes WHERE frame_id IN (${marks}) ORDER BY sort_order, id`).all(...ids);
  const imgBy = new Map();
  const sizeBy = new Map();
  for (const i of images) (imgBy.get(i.frame_id) || imgBy.set(i.frame_id, []).get(i.frame_id)).push(i);
  for (const s of sizes) (sizeBy.get(s.frame_id) || sizeBy.set(s.frame_id, []).get(s.frame_id)).push(s);

  return rows.map((r) => {
    const imgs = imgBy.get(r.id) || [];
    const szs = (sizeBy.get(r.id) || []).map((s) => ({
      id: s.id,
      label: s.label,
      widthIn: s.width_in,
      heightIn: s.height_in,
      extraPrice: s.extra_price,
      price: Math.round((r.base_price + s.extra_price) * 100) / 100,
    }));
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      categoryId: r.category_id,
      categoryName: r.category_name || null,
      categorySlug: r.category_slug || null,
      description: r.description,
      basePrice: r.base_price,
      minPrice: szs.length ? Math.min(...szs.map((s) => s.price)) : r.base_price,
      material: r.material,
      color: r.color,
      colorHex: r.color_hex,
      matHex: r.mat_hex,
      borderStyle: r.border_style,
      glassType: r.glass_type,
      stock: r.stock,
      inStock: r.stock > 0,
      isFeatured: Boolean(r.is_featured),
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      image: imgs[0] ? imgs[0].path : null,
      images: imgs.map((i) => ({ id: i.id, path: i.path, alt: i.alt })),
      sizes: szs,
    };
  });
}

const BASE_SELECT = `SELECT f.*, c.name AS category_name, c.slug AS category_slug
                     FROM frames f LEFT JOIN categories c ON c.id = f.category_id`;

function list({ q, category, featured, color, sort, includeInactive }) {
  const where = [];
  const params = [];
  if (!includeInactive) where.push('f.is_active = 1');
  if (q) {
    where.push('(f.name LIKE ? OR f.description LIKE ? OR f.material LIKE ? OR f.color LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (category) {
    if (/^\d+$/.test(String(category))) { where.push('f.category_id = ?'); params.push(Number(category)); }
    else { where.push('c.slug = ?'); params.push(String(category)); }
  }
  if (featured) where.push('f.is_featured = 1');
  if (color) { where.push('f.color = ? COLLATE NOCASE'); params.push(color); }

  let order = 'f.created_at DESC, f.id DESC';
  if (sort === 'name') order = 'f.name COLLATE NOCASE ASC';
  if (sort === 'price_asc') order = 'f.base_price ASC';
  if (sort === 'price_desc') order = 'f.base_price DESC';

  const rows = db.prepare(`${BASE_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`).all(...params);
  let frames = hydrate(rows);
  if (sort === 'price_asc') frames.sort((a, b) => a.minPrice - b.minPrice);
  if (sort === 'price_desc') frames.sort((a, b) => b.minPrice - a.minPrice);
  return frames;
}

function get(id, includeInactive = false) {
  const row = db.prepare(`${BASE_SELECT} WHERE f.id = ?`).get(id);
  if (!row || (!row.is_active && !includeInactive)) return null;
  return hydrate([row])[0];
}

function writeChildren(frameId, data) {
  const oldImages = db.prepare('SELECT path FROM frame_images WHERE frame_id = ?').all(frameId).map((r) => r.path);

  db.prepare('DELETE FROM frame_images WHERE frame_id = ?').run(frameId);
  const insImg = db.prepare('INSERT INTO frame_images (frame_id, path, alt, sort_order) VALUES (?,?,?,?)');
  data.images.forEach((p, i) => insImg.run(frameId, p, data.name, i));

  // Sizes: update in place by label so existing order history / client carts keep valid IDs where possible.
  const existing = db.prepare('SELECT id, label FROM frame_sizes WHERE frame_id = ?').all(frameId);
  const keep = new Set(data.sizes.map((s) => s.label));
  for (const e of existing) if (!keep.has(e.label)) db.prepare('DELETE FROM frame_sizes WHERE id = ?').run(e.id);
  const byLabel = new Map(existing.map((e) => [e.label, e.id]));
  const ins = db.prepare('INSERT INTO frame_sizes (frame_id, label, width_in, height_in, extra_price, sort_order) VALUES (?,?,?,?,?,?)');
  const upd = db.prepare('UPDATE frame_sizes SET width_in=?, height_in=?, extra_price=?, sort_order=? WHERE id=?');
  const seen = new Set();
  data.sizes.forEach((s, i) => {
    if (seen.has(s.label)) throw new AppError(`Size "${s.label}" is listed twice.`, 400, 'DUPLICATE_SIZE');
    seen.add(s.label);
    if (byLabel.has(s.label)) upd.run(s.widthIn, s.heightIn, s.extraPrice, i, byLabel.get(s.label));
    else ins.run(frameId, s.label, s.widthIn, s.heightIn, s.extraPrice, i);
  });

  // Remove files for images that are no longer attached (only our own frame uploads).
  const removed = oldImages.filter((p) => !data.images.includes(p));
  return removed;
}

function create(data) {
  if (data.categoryId) {
    if (!db.prepare('SELECT 1 FROM categories WHERE id = ?').get(data.categoryId)) {
      throw new AppError('Choose a valid category.', 400, 'INVALID_CATEGORY');
    }
  }
  const tx = db.transaction(() => {
    const id = db
      .prepare(
        `INSERT INTO frames (code, name, category_id, description, base_price, material, color, color_hex, mat_hex,
           border_style, glass_type, stock, is_featured, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        `TMP-${crypto.randomBytes(4).toString('hex')}`, data.name, data.categoryId || null, data.description,
        data.basePrice, data.material, data.color, data.colorHex, data.matHex, data.borderStyle, data.glassType,
        data.stock, data.isFeatured ? 1 : 0, data.isActive ? 1 : 0
      ).lastInsertRowid;
    db.prepare('UPDATE frames SET code = ? WHERE id = ?').run(`FR-${String(id).padStart(4, '0')}`, id);
    writeChildren(id, data);
    return id;
  });
  return get(tx(), true);
}

function update(id, data) {
  if (!db.prepare('SELECT 1 FROM frames WHERE id = ?').get(id)) throw new AppError('Frame not found.', 404, 'NOT_FOUND');
  if (data.categoryId && !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(data.categoryId)) {
    throw new AppError('Choose a valid category.', 400, 'INVALID_CATEGORY');
  }
  let removed = [];
  db.transaction(() => {
    db.prepare(
      `UPDATE frames SET name=?, category_id=?, description=?, base_price=?, material=?, color=?, color_hex=?, mat_hex=?,
         border_style=?, glass_type=?, stock=?, is_featured=?, is_active=?, updated_at=datetime('now') WHERE id=?`
    ).run(
      data.name, data.categoryId || null, data.description, data.basePrice, data.material, data.color, data.colorHex,
      data.matHex, data.borderStyle, data.glassType, data.stock, data.isFeatured ? 1 : 0, data.isActive ? 1 : 0, id
    );
    removed = writeChildren(id, data);
  })();
  for (const p of removed) deleteUploadQuietly(p);
  return get(id, true);
}

function remove(id) {
  const frame = get(id, true);
  if (!frame) throw new AppError('Frame not found.', 404, 'NOT_FOUND');
  db.prepare('DELETE FROM frames WHERE id = ?').run(id); // order history keeps its own snapshot
  for (const img of frame.images) deleteUploadQuietly(img.path);
}

module.exports = { list, get, create, update, remove };
