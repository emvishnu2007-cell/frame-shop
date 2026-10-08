'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const AppError = require('../utils/AppError');

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Verifies the real file signature, not just the client-declared type. */
function detectImageType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

function makeUploader(subdir) {
  const dir = path.join(config.uploadsDir, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = MIME_TO_EXT[file.mimetype] || '.bin';
      cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      if (!MIME_TO_EXT[file.mimetype]) {
        return cb(new AppError('Please upload a valid image (JPG, PNG or WebP).', 400, 'INVALID_IMAGE'));
      }
      cb(null, true);
    },
  }).single('file');
}

/** After multer saved the file, check magic bytes and delete the file if it isn't a real image. */
function verifySavedImage(file) {
  if (!file) throw new AppError('Please choose an image to upload.', 400, 'NO_FILE');
  const fd = fs.openSync(file.path, 'r');
  const head = Buffer.alloc(16);
  try { fs.readSync(fd, head, 0, 16, 0); } finally { fs.closeSync(fd); }
  if (!detectImageType(head)) {
    try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    throw new AppError('Please upload a valid image (JPG, PNG or WebP).', 400, 'INVALID_IMAGE');
  }
}

module.exports = { makeUploader, verifySavedImage, detectImageType };
