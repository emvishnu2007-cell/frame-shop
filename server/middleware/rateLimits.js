'use strict';
const rateLimit = require('express-rate-limit');

const make = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message } },
  });

// In automated tests we set RATE_LIMIT_OFF=1 so limits don't interfere.
const off = process.env.RATE_LIMIT_OFF === '1';
const passthrough = (req, res, next) => next();
const maybe = (limiter) => (off ? passthrough : limiter);

module.exports = {
  apiLimiter: maybe(make(15, 600, 'Too many requests. Please try again in a few minutes.')),
  loginLimiter: maybe(make(15, 10, 'Too many sign-in attempts. Please try again in 15 minutes.')),
  orderLimiter: maybe(make(60, 20, 'Too many bookings from this device. Please try again later.')),
  uploadLimiter: maybe(make(10, 40, 'Too many uploads. Please wait a few minutes and try again.')),
  trackLimiter: maybe(make(15, 40, 'Too many lookups. Please try again in a few minutes.')),
};
