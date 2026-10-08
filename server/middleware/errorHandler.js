'use strict';
const { ZodError } = require('zod');
const multer = require('multer');
const config = require('../config');

function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please check the highlighted fields.', fields },
    });
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `That image is too large. Maximum size is ${config.maxUploadMb} MB.`
        : 'Please upload a valid image.';
    return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message } });
  }

  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'The request could not be read.' } });
  }

  if (err && err.expose) {
    return res.status(err.status || 400).json({
      error: { code: err.code || 'ERROR', message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  if (err && err.code && String(err.code).startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'That value already exists or is still in use.' },
    });
  }

  // Unknown error: log it server-side, never leak internals to the customer.
  console.error('[error]', req.method, req.originalUrl, err);
  res.status(500).json({
    error: { code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' },
  });
}

module.exports = { notFound, errorHandler };
