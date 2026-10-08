'use strict';
const db = require('../db');
const AppError = require('../utils/AppError');
const { slugify } = require('../utils/helpers');
const { categorySchema } = require('../utils/schemas');

const SELECT = `SELECT c.*, (SELECT COUNT(*) FROM frames f WHERE f.category_id = c.id AND f.is_active = 1) AS frame_count
                FROM categories c`;

const toApi = (c) => ({
  id: c.id, name: c.name, slug: c.slug, description: c.description, image: c.image,
  sortOrder: c.sort_order, frameCount: c.frame_count,
});

const parseId = (v) => {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Category not found.', 404, 'NOT_FOUND');
  return id;
};

function uniqueSlug(name, ignoreId = 0) {
  const base = slugify(name) || 'category';
  let slug = base;
  let n = 2;
  while (db.prepare('SELECT 1 FROM categories WHERE slug = ? AND id != ?').get(slug, ignoreId)) slug = `${base}-${n++}`;
  return slug;
}

function list(req, res) {
  res.json({ categories: db.prepare(`${SELECT} ORDER BY c.sort_order, c.name`).all().map(toApi) });
}

function create(req, res) {
  const d = categorySchema.parse(req.body);
  if (db.prepare('SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE').get(d.name)) {
    throw new AppError('A category with this name already exists.', 409, 'DUPLICATE');
  }
  const id = db
    .prepare('INSERT INTO categories (name, slug, description, image, sort_order) VALUES (?,?,?,?,?)')
    .run(d.name, uniqueSlug(d.name), d.description, d.image || null, d.sortOrder).lastInsertRowid;
  res.status(201).json({ category: toApi(db.prepare(`${SELECT} WHERE c.id = ?`).get(id)) });
}

function update(req, res) {
  const id = parseId(req.params.id);
  const d = categorySchema.parse(req.body);
  if (!db.prepare('SELECT 1 FROM categories WHERE id = ?').get(id)) throw new AppError('Category not found.', 404, 'NOT_FOUND');
  if (db.prepare('SELECT 1 FROM categories WHERE name = ? COLLATE NOCASE AND id != ?').get(d.name, id)) {
    throw new AppError('A category with this name already exists.', 409, 'DUPLICATE');
  }
  db.prepare(
    "UPDATE categories SET name=?, slug=?, description=?, image=?, sort_order=?, updated_at=datetime('now') WHERE id=?"
  ).run(d.name, uniqueSlug(d.name, id), d.description, d.image || null, d.sortOrder, id);
  res.json({ category: toApi(db.prepare(`${SELECT} WHERE c.id = ?`).get(id)) });
}

function remove(req, res) {
  const id = parseId(req.params.id);
  const used = db.prepare('SELECT COUNT(*) AS n FROM frames WHERE category_id = ?').get(id).n;
  if (used > 0) {
    throw new AppError(`This category still has ${used} frame${used > 1 ? 's' : ''}. Move or delete them first.`, 409, 'CATEGORY_IN_USE');
  }
  const res2 = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (!res2.changes) throw new AppError('Category not found.', 404, 'NOT_FOUND');
  res.json({ message: 'Category deleted.' });
}

module.exports = { list, create, update, remove };
