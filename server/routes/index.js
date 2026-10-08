'use strict';
const express = require('express');
const { asyncHandler: a } = require('../utils/helpers');
const { requireAdmin, optionalAdmin } = require('../middleware/auth');
const rl = require('../middleware/rateLimits');

const auth = require('../controllers/authController');
const frames = require('../controllers/frameController');
const categories = require('../controllers/categoryController');
const orders = require('../controllers/orderController');
const upload = require('../controllers/uploadController');
const email = require('../controllers/emailController');
const admin = require('../controllers/adminController');

const router = express.Router();
const adminOnly = requireAdmin();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// ---------- Auth ----------
router.post('/auth/login', rl.loginLimiter, a(auth.login));
router.get('/auth/me', requireAdmin({ allowPendingPasswordChange: true }), a(auth.me));
router.post('/auth/change-password', requireAdmin({ allowPendingPasswordChange: true }), a(auth.changePassword));

// ---------- Public catalogue ----------
router.get('/settings', a(admin.publicSettings));
router.get('/reviews', a(admin.listReviewsPublic));
router.get('/categories', a(categories.list));
router.get('/frames', optionalAdmin, a(frames.list));
router.get('/frames/:id', optionalAdmin, a(frames.get));

// ---------- Admin catalogue ----------
router.post('/categories', adminOnly, a(categories.create));
router.put('/categories/:id', adminOnly, a(categories.update));
router.delete('/categories/:id', adminOnly, a(categories.remove));
router.post('/frames', adminOnly, a(frames.create));
router.put('/frames/:id', adminOnly, a(frames.update));
router.delete('/frames/:id', adminOnly, a(frames.remove));

// ---------- Uploads ----------
router.post('/upload', rl.uploadLimiter, upload.customerPhoto); // customer photos
router.post('/upload/frame', adminOnly, upload.frameImage);
router.post('/upload/logo', adminOnly, upload.branding);

// ---------- Orders ----------
router.post('/orders/quote', a(orders.quote));
router.get('/orders/track', rl.trackLimiter, a(orders.track));
router.post('/orders', rl.orderLimiter, a(orders.create));
router.get('/orders', adminOnly, a(orders.list));
router.get('/orders/:orderId', adminOnly, a(orders.get));
router.put('/orders/:orderId/status', adminOnly, a(orders.updateStatus));
router.post('/orders/:orderId/cancel', adminOnly, a(orders.cancel));
router.get('/orders/:orderId/receipt', rl.trackLimiter, optionalAdmin, a(orders.receipt));
router.post('/orders/:orderId/payment/create', rl.trackLimiter, a(orders.paymentCreate));
router.post('/orders/:orderId/payment/verify', rl.trackLimiter, a(orders.paymentVerify));

// ---------- Email ----------
router.post('/email/send', adminOnly, a(email.send));

// ---------- Admin ----------
router.get('/admin/stats', adminOnly, a(admin.stats));
router.get('/admin/customers', adminOnly, a(admin.customers));
router.get('/admin/settings', adminOnly, a(admin.getSettings));
router.put('/admin/settings', adminOnly, a(admin.putSettings));
router.get('/admin/coupons', adminOnly, a(admin.listCoupons));
router.post('/admin/coupons', adminOnly, a(admin.createCoupon));
router.put('/admin/coupons/:id', adminOnly, a(admin.updateCoupon));
router.delete('/admin/coupons/:id', adminOnly, a(admin.deleteCoupon));
router.get('/admin/reviews', adminOnly, a(admin.listReviewsAdmin));
router.post('/admin/reviews', adminOnly, a(admin.createReview));
router.put('/admin/reviews/:id', adminOnly, a(admin.updateReview));
router.delete('/admin/reviews/:id', adminOnly, a(admin.deleteReview));

module.exports = router;
