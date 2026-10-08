'use strict';
const frames = require('../services/frameService');
const AppError = require('../utils/AppError');
const { frameSchema } = require('../utils/schemas');

const parseId = (v) => {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Frame not found.', 404, 'NOT_FOUND');
  return id;
};

function list(req, res) {
  const { q, category, featured, color, sort, all } = req.query;
  const includeInactive = all === '1' && Boolean(req.admin);
  res.json({
    frames: frames.list({
      q: q ? String(q).slice(0, 80) : '',
      category,
      featured: featured === '1' || featured === 'true',
      color: color ? String(color) : '',
      sort,
      includeInactive,
    }),
  });
}

function get(req, res) {
  const frame = frames.get(parseId(req.params.id), Boolean(req.admin));
  if (!frame) throw new AppError('That frame could not be found.', 404, 'NOT_FOUND');
  res.json({ frame });
}

function create(req, res) {
  const data = frameSchema.parse(req.body);
  res.status(201).json({ frame: frames.create(data) });
}

function update(req, res) {
  const data = frameSchema.parse(req.body);
  res.json({ frame: frames.update(parseId(req.params.id), data) });
}

function remove(req, res) {
  frames.remove(parseId(req.params.id));
  res.json({ message: 'Frame deleted.' });
}

module.exports = { list, get, create, update, remove };
