'use strict';
const { z } = require('zod');

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready', 'Out for Delivery', 'Completed', 'Cancelled'];
const PAYMENT_STATUSES = ['Unpaid', 'Paid', 'Refunded', 'Failed'];
const PAYMENT_METHODS = ['cod', 'store', 'online'];

const trimmed = (label, min = 1, max = 200) =>
  z.string({ required_error: `${label} is required` }).trim().min(min, `${label} is required`).max(max, `${label} is too long`);

const phone = z
  .string({ required_error: 'Mobile number is required' })
  .trim()
  .refine((v) => /^\+?[0-9\s-]{10,15}$/.test(v) && v.replace(/\D/g, '').length >= 10, 'Enter a valid mobile number');

const photoPath = z
  .string()
  .regex(/^\/uploads\/photos\/[a-f0-9]{32}\.(jpg|png|webp)$/, 'Invalid photo')
  .nullish();

const orderSchema = z.object({
  customer: z.object({
    name: trimmed('Full name', 2, 100),
    phone,
    email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address').max(200),
    address: trimmed('Delivery address', 5, 400),
    city: trimmed('City', 2, 80),
    pincode: z.string({ required_error: 'Pincode is required' }).trim().regex(/^[0-9]{6}$/, 'Enter a valid 6-digit pincode'),
    notes: z.string().trim().max(1000, 'Instructions are too long').optional().default(''),
  }),
  items: z
    .array(
      z.object({
        frameId: z.number().int().positive(),
        sizeId: z.number().int().positive(),
        quantity: z.number().int().min(1, 'Minimum quantity is 1').max(50, 'Maximum quantity is 50'),
        orientation: z.enum(['portrait', 'landscape']).optional().default('portrait'),
        photoPath,
      })
    )
    .min(1, 'Your cart is empty')
    .max(30),
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: 'Choose a payment method' }) }),
  couponCode: z.string().trim().max(40).optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(10, 'Use at least 10 characters')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
});

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #1F1D1B');

const frameSchema = z.object({
  name: trimmed('Name', 2, 120),
  categoryId: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(3000).optional().default(''),
  basePrice: z.number().min(0, 'Price cannot be negative').max(10000000),
  material: z.string().trim().max(100).optional().default(''),
  color: z.string().trim().max(60).optional().default(''),
  colorHex: hex.optional().default('#1F1D1B'),
  matHex: hex.optional().default('#FFFFFF'),
  borderStyle: z.enum(['thin', 'classic', 'wide', 'ornate']).optional().default('classic'),
  glassType: z.string().trim().max(100).optional().default(''),
  stock: z.number().int().min(0).max(1000000),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  images: z.array(z.string().regex(/^\/uploads\/frames\/[A-Za-z0-9._-]+$/, 'Invalid image path')).max(8).optional().default([]),
  sizes: z
    .array(
      z.object({
        label: trimmed('Size label', 1, 40),
        widthIn: z.number().positive('Width must be positive').max(200),
        heightIn: z.number().positive('Height must be positive').max(200),
        extraPrice: z.number().min(0, 'Price cannot be negative').max(10000000),
      })
    )
    .min(1, 'Add at least one size')
    .max(20),
});

const categorySchema = z.object({
  name: trimmed('Name', 2, 80),
  description: z.string().trim().max(500).optional().default(''),
  image: z.string().regex(/^\/uploads\/frames\/[A-Za-z0-9._-]+$/).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional().default(0),
});

const statusSchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
    notifyCustomer: z.boolean().optional().default(true),
  })
  .refine((v) => v.status || v.paymentStatus, 'Provide a status to update');

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().min(3, 'Code is too short').max(30).regex(/^[A-Z0-9_-]+$/, 'Letters, numbers, - and _ only'),
  percentOff: z.number().gt(0).max(100),
  minSubtotal: z.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const reviewSchema = z.object({
  author: trimmed('Name', 2, 80),
  location: z.string().trim().max(80).optional().default(''),
  rating: z.number().int().min(1).max(5),
  body: trimmed('Review', 5, 600),
  isVisible: z.boolean().optional().default(true),
});

const settingsSchema = z
  .object({
    shop_name: trimmed('Shop name', 2, 80),
    shop_tagline: z.string().trim().max(160),
    shop_logo: z.string().regex(/^(\/uploads\/branding\/[A-Za-z0-9._-]+)?$/),
    shop_address: z.string().trim().max(300),
    shop_phone: z.string().trim().max(30),
    shop_email: z.string().trim().email('Enter a valid shop email'),
    whatsapp_number: z.string().trim().regex(/^[0-9]{0,15}$/, 'Digits only, with country code (e.g. 919876543210)'),
    business_hours: z.string().trim().max(300),
    maps_embed_url: z.string().trim().max(600).refine((v) => v === '' || /^https:\/\//.test(v), 'Must start with https://'),
    instagram_url: z.string().trim().max(200),
    facebook_url: z.string().trim().max(200),
    delivery_charge: z.coerce.number().min(0).max(100000),
    free_delivery_above: z.coerce.number().min(0).max(10000000),
    tax_percent: z.coerce.number().min(0).max(100),
    tax_label: z.string().trim().max(20),
    currency: z.string().trim().length(3, 'Use a 3-letter code, e.g. INR'),
    smtp_host: z.string().trim().max(200),
    smtp_port: z.coerce.number().int().min(1).max(65535),
    smtp_secure: z.enum(['true', 'false']),
    smtp_user: z.string().trim().max(200),
    smtp_password: z.string().max(300).optional(),
    smtp_from_name: z.string().trim().max(80),
  })
  .partial();

module.exports = {
  ORDER_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS,
  orderSchema, loginSchema, passwordChangeSchema, frameSchema, categorySchema,
  statusSchema, couponSchema, reviewSchema, settingsSchema,
};
