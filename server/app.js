'use strict';
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const routes = require('./routes');
const rl = require('./middleware/rateLimits');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // Only force HTTPS upgrades in production, where the site is served over HTTPS.
          'upgrade-insecure-requests': config.isProd && /^https:/.test(config.clientUrl) ? [] : null,
          'img-src': ["'self'", 'data:', 'blob:'],
          'script-src': ["'self'", 'https://checkout.razorpay.com'],
          'frame-src': ["'self'", 'https://api.razorpay.com', 'https://www.google.com', 'https://maps.google.com'],
          'connect-src': ["'self'", 'https://lumberjack.razorpay.com', 'https://api.razorpay.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        },
      },
    })
  );
  app.use(compression());

  const allowed = new Set([config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173']);
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '200kb' }));

  // Uploaded images: served as static files, never executed or sniffed.
  app.use(
    '/uploads',
    express.static(config.uploadsDir, {
      maxAge: '7d',
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    })
  );

  app.use('/api', rl.apiLimiter, routes);
  app.use('/api', notFound);

  // In production the built React app is served by the same server.
  if (fs.existsSync(path.join(config.clientDist, 'index.html'))) {
    app.use(express.static(config.clientDist, { maxAge: '1h', index: false }));
    app.get('*', (req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
