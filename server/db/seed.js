'use strict';
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('../config');
const db = require('./index');
const { writeFrameImages } = require('./seedImages');
const { slugify } = require('../utils/helpers');

const reset = process.argv.includes('--reset');

const SIZES = [
  { label: '4 × 6 in', w: 4, h: 6, extra: 0 },
  { label: '5 × 7 in', w: 5, h: 7, extra: 100 },
  { label: '8 × 10 in', w: 8, h: 10, extra: 300 },
  { label: '10 × 12 in', w: 10, h: 12, extra: 500 },
  { label: '12 × 18 in', w: 12, h: 18, extra: 1000 },
  { label: '16 × 20 in', w: 16, h: 20, extra: 1500 },
  { label: '18 × 24 in', w: 18, h: 24, extra: 2200 },
  { label: '20 × 30 in', w: 20, h: 30, extra: 3000 },
];

const CATEGORIES = [
  ['Classic Frames', 'Timeless profiles that suit every wall and every memory.'],
  ['Modern Frames', 'Clean, slim lines for contemporary homes and galleries.'],
  ['Wooden Frames', 'Warm, hand-finished solid wood with natural grain.'],
  ['Premium Frames', 'Statement frames with rich finishes and fine detailing.'],
  ['Collage Frames', 'Gallery-style mats designed for storytelling layouts.'],
  ['Wedding Frames', 'Elegant frames made for your most celebrated day.'],
  ['Family Frames', 'Generous frames for portraits that bring everyone together.'],
  ['Kids Frames', 'Soft colours and sturdy builds for little ones.'],
  ['Custom Frames', 'Bespoke made-to-order frames built around your vision.'],
];

// name, category, base, material, color, hex, mat, border, glass, stock, featured, sizeMultiplier, description
const FRAMES = [
  ['Heritage Walnut', 'Wooden Frames', 650, 'Solid Walnut', 'Walnut Brown', '#5C3A21', '#FBF8F2', 'classic', 'Clear Float Glass', 40, 1, 1, 'A deep walnut frame with a satin hand-rubbed finish. Rich, warm and built to be passed down.'],
  ['Onyx Slim', 'Modern Frames', 500, 'Aluminium', 'Matte Black', '#1A1A1A', '#FFFFFF', 'thin', 'Anti-Glare Glass', 60, 1, 1, 'A razor-thin matte black profile that lets your photograph take centre stage.'],
  ['Gilded Baroque', 'Premium Frames', 1200, 'Resin & Gold Leaf', 'Antique Gold', '#B8903F', '#F7F0E0', 'ornate', 'UV-Protect Glass', 18, 1, 1.25, 'Hand-finished ornate corners and a warm antique gold leaf. An heirloom statement piece.'],
  ['Nordic Oak', 'Wooden Frames', 600, 'Natural Oak', 'Light Oak', '#C9A77A', '#FFFFFF', 'classic', 'Clear Float Glass', 55, 1, 1, 'Pale, airy oak with a visible grain. Calm and effortlessly Scandinavian.'],
  ['Gallery White', 'Modern Frames', 550, 'Engineered Wood', 'Gallery White', '#F2F0EB', '#FFFFFF', 'thin', 'Anti-Glare Glass', 48, 0, 1, 'A bright white frame with a generous mat, inspired by modern art galleries.'],
  ['Mosaic Gallery', 'Collage Frames', 780, 'Pine Wood', 'Warm Grey', '#8C8680', '#FFFFFF', 'wide', 'Clear Float Glass', 25, 0, 1.1, 'A wide-matted frame designed for gallery walls and curated memory collections.'],
  ['Wedding Ivory', 'Wedding Frames', 900, 'Resin', 'Ivory', '#EDE3CF', '#FFFBF3', 'ornate', 'UV-Protect Glass', 30, 1, 1.15, 'Soft ivory with delicate detailing. Made to hold the day you will always remember.'],
  ['Family Heirloom', 'Family Frames', 800, 'Mahogany', 'Deep Mahogany', '#6B2F1E', '#FBF6EC', 'classic', 'Clear Float Glass', 36, 0, 1.1, 'A generous mahogany frame for portraits that gather everyone in one place.'],
  ['Little Sprout', 'Kids Frames', 450, 'Painted Pine', 'Sage Green', '#9BB79A', '#FFFFFF', 'wide', 'Acrylic (Shatter-Safe)', 70, 0, 0.9, 'A soft sage frame with shatter-safe acrylic. Safe and sweet for children\'s rooms.'],
  ['Champagne Edge', 'Premium Frames', 1000, 'Brushed Metal', 'Champagne', '#D8C3A0', '#FFFFFF', 'classic', 'UV-Protect Glass', 22, 1, 1.2, 'A brushed champagne metal frame with a refined, light-catching edge.'],
  ['Classic Black Wood', 'Classic Frames', 480, 'Solid Wood', 'Ebony Black', '#2B2B2B', '#FFFFFF', 'classic', 'Clear Float Glass', 80, 0, 1, 'The everyday essential: a clean ebony black wooden frame that suits any photograph.'],
  ['Bespoke Studio', 'Custom Frames', 1500, 'Choice of Wood', 'Made to Order', '#8A6730', '#FAF7F2', 'wide', 'Museum Glass', 15, 0, 1.3, 'Tell us your dream frame. Our craftsmen build it to your colour, size and finish.'],
];

const REVIEWS = [
  ['Sample customer', 'Chennai', 5, 'The frame arrived beautifully packed and looked even better than the photo on the website. The finish is flawless.'],
  ['Sample customer', 'Bengaluru', 5, 'Uploading my photo and previewing it inside the frame made choosing so easy. The print quality was superb.'],
  ['Sample customer', 'Puducherry', 5, 'Ordered a wedding frame as a gift. Delivery was on time and the receipt email arrived immediately.'],
];

function wipe() {
  db.exec(`
    DELETE FROM payments; DELETE FROM order_items; DELETE FROM orders; DELETE FROM order_counters;
    DELETE FROM customers; DELETE FROM frame_images; DELETE FROM frame_sizes; DELETE FROM frames;
    DELETE FROM categories; DELETE FROM coupons; DELETE FROM reviews;
    DELETE FROM sqlite_sequence WHERE name IN ('payments','order_items','orders','customers','frame_images','frame_sizes','frames','categories','coupons','reviews');
  `);
}

function seedAdmin() {
  const existing = db.prepare('SELECT id FROM admins WHERE email = ?').get(config.admin.email);
  if (!existing) {
    db.prepare('INSERT INTO admins (email, name, password_hash, must_change_password) VALUES (?,?,?,1)')
      .run(config.admin.email, 'Administrator', bcrypt.hashSync(config.admin.password, 12));
    console.log(`Admin created: ${config.admin.email}`);
  } else if (reset) {
    db.prepare("UPDATE admins SET password_hash = ?, must_change_password = 1, updated_at = datetime('now') WHERE id = ?")
      .run(bcrypt.hashSync(config.admin.password, 12), existing.id);
    console.log(`Admin password reset to the value of ADMIN_PASSWORD: ${config.admin.email}`);
  } else {
    console.log(`Admin already exists: ${config.admin.email}`);
  }
}

function seedCatalogue() {
  const insCat = db.prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?,?,?,?)');
  const catIds = new Map();
  CATEGORIES.forEach(([name, desc], i) => catIds.set(name, insCat.run(name, slugify(name), desc, i).lastInsertRowid));

  const insFrame = db.prepare(
    `INSERT INTO frames (code, name, category_id, description, base_price, material, color, color_hex, mat_hex, border_style,
       glass_type, stock, is_featured, is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`
  );
  const insImg = db.prepare('INSERT INTO frame_images (frame_id, path, alt, sort_order) VALUES (?,?,?,?)');
  const insSize = db.prepare('INSERT INTO frame_sizes (frame_id, label, width_in, height_in, extra_price, sort_order) VALUES (?,?,?,?,?,?)');
  const framesDir = path.join(config.uploadsDir, 'frames');

  FRAMES.forEach(([name, cat, base, material, color, hex, mat, border, glass, stock, featured, mult, desc], idx) => {
    const id = insFrame.run(
      `FR-${String(idx + 1).padStart(4, '0')}`, name, catIds.get(cat), desc, base, material, color, hex, mat, border,
      glass, stock, featured
    ).lastInsertRowid;
    writeFrameImages(framesDir, slugify(name), { color: hex, mat, style: border }).forEach((p, i) => insImg.run(id, p, name, i));
    SIZES.forEach((s, i) => insSize.run(id, s.label, s.w, s.h, Math.round((s.extra * mult) / 10) * 10, i));
  });

  const insCoupon = db.prepare('INSERT INTO coupons (code, percent_off, min_subtotal, is_active) VALUES (?,?,?,1)');
  insCoupon.run('WELCOME10', 10, 500);

  const insReview = db.prepare('INSERT INTO reviews (author, location, rating, body, is_visible) VALUES (?,?,?,?,1)');
  REVIEWS.forEach((r) => insReview.run(...r));
}

db.transaction(() => {
  if (reset) wipe();
  seedAdmin();
  const hasFrames = db.prepare('SELECT COUNT(*) AS n FROM frames').get().n > 0;
  if (hasFrames) {
    console.log('Catalogue already has data - skipped. Use "npm run db:reset" to wipe and re-seed (this deletes ALL orders).');
  } else {
    seedCatalogue();
    console.log(`Seeded ${CATEGORIES.length} categories, ${FRAMES.length} frames, ${SIZES.length} sizes each, 1 coupon (WELCOME10), ${REVIEWS.length} placeholder reviews.`);
  }
})();

console.log('\nDefault admin login:');
console.log(`  Email:    ${config.admin.email}`);
console.log(`  Password: ${config.admin.password}   (you must change it on first login)`);
