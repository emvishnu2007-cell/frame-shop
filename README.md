# Delight Digital Frames: Online Custom Photo Frame Shop

A full-stack frame shop: customers browse frames, choose a size, upload a photo, see a live preview and price, book online, and receive an **email confirmation with a PDF invoice**. Staff manage everything from an **admin panel**.

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Lucide icons |
| Backend | Node.js, Express |
| Database | SQLite (`better-sqlite3`), schema in `server/db/schema.sql` |
| Auth | bcrypt password hashing, JWT bearer tokens |
| Email / PDF | Nodemailer (SMTP), PDFKit |
| Payments | Cash on Delivery, Pay at Store, optional Razorpay |

> **Note on Prisma:** the brief suggested Prisma "if appropriate". This project uses plain SQL with `better-sqlite3` instead. Tables are created automatically on first start, so there is no migration step, and there is no native Prisma engine to install on Windows. The schema (foreign keys, unique constraints, indexes, timestamps) is in `server/db/schema.sql`.

---

## 1. Requirements

- **Node.js 18 or newer** (20/22 recommended): https://nodejs.org
- npm (comes with Node)
- A Windows, macOS or Linux machine. `better-sqlite3` ships prebuilt binaries for current Node versions, so no compiler is normally needed.

## 2. Installation

**Windows PowerShell**
```powershell
cd frame-shop
Copy-Item .env.example .env
npm install
```

**macOS / Linux**
```bash
cd frame-shop
cp .env.example .env
npm install
```

`npm install` at the root also installs the client (`client/`) automatically.

## 3. Environment variables (`.env`)

The `.env` file lives in the **project root** (next to `package.json`). It is git-ignored; never commit it. Every variable is documented in `.env.example`.

| Variable | Purpose |
|---|---|
| `PORT` | API port (default `5000`) |
| `CLIENT_URL` | Public site URL, used in email links and CORS (`http://localhost:5173` in dev) |
| `DATABASE_URL` | SQLite file path (default `./data/frameshop.db`) |
| `JWT_SECRET` | **Required in production.** Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Default admin created on first run |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME` | Email sending |
| `SHOP_NAME`, `SHOP_EMAIL`, `SHOP_PHONE` | Initial shop details (editable later in Admin → Settings) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Optional online payments |

## 4. Database setup, migration and seeding

The database file and all tables are created automatically the first time the server (or any db script) runs. There is nothing to migrate.

```bash
npm run db:init    # optional: create tables and print them
npm run db:seed    # sample categories, 12 frames x 8 sizes, a coupon, placeholder reviews, admin account
npm run db:reset   # WIPES all data (including orders) and re-seeds
```

Seeding is safe to repeat: it will not duplicate data (only `db:reset` wipes).

## 5. Run the website

```bash
npm run dev
```

This starts both processes with one command:

- Storefront: **http://localhost:5173**
- API: http://localhost:5000 (the storefront proxies `/api` and `/uploads` to it)

## 6. Admin login

- URL: **http://localhost:5173/admin/login**
- Default email: `admin@frameshop.local`
- Default password: `Admin@12345`

You are **forced to set a new password on first login** (min 10 characters, upper and lower case, and a number). Change the defaults in `.env` *before* the first run if you prefer.

### Creating / resetting an admin
- Edit `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`, then run `npm run db:seed`. A new admin is created if that email doesn't exist.
- To reset an existing admin's password back to `ADMIN_PASSWORD` (forcing a change at next login): `npm run db:reset` (**also wipes orders and the catalogue**; use only on a fresh install), or delete the admin row in the `admins` table and restart.

## 7. Configure email (SMTP)

You can use either `.env` or **Admin → Settings → Email (SMTP)** (settings saved in the admin panel take priority). The password is never sent to the browser.

**Gmail** (recommended for testing):
1. Turn on 2-Step Verification for the Google account.
2. Create an **App Password**: https://myaccount.google.com/apppasswords
3. Set: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_USER=you@gmail.com`, `SMTP_PASSWORD=<16-character app password>`.

Other providers (Brevo, SendGrid, Zoho, your hosting provider) work the same way. Use port `465` with `SMTP_SECURE=true` for SSL.

**If SMTP is not configured or fails, bookings are still saved.** The customer sees *"Unable to send email. Your booking is still saved."* and can still download the receipt.

## 8. Test a booking

1. Open http://localhost:5173/frames and click a frame.
2. Choose a size (the price updates), upload a JPG/PNG/WebP photo (preview appears), pick quantity.
3. Click **Book Now** (or Add to Cart, then Cart → Checkout).
4. Fill in the form (try submitting empty to see validation), choose a payment method, click **Confirm Booking**.
5. You land on the success page with an order ID like `FRM-2026-00001`.
6. Try coupon code `WELCOME10` in the cart for 10% off.

## 9. Test email

- Admin → Settings → **Send a test email** (after saving SMTP settings), or
- Place a booking with a real email address: the confirmation arrives with the PDF attached. Check spam if you don't see it.
- Admin → Orders → View → **Resend confirmation** re-sends it any time.

## 10. Generate / download the invoice

- Customer: **Download Receipt** button on the success page, or Track Order → Download Receipt.
- Admin: Orders table → download icon, or the order's detail window → **Download invoice**.
- A copy of each generated PDF is also stored in `server/invoices/`.

## 11. Track an order / update status

- Customers: **Track Order** page, Order ID + the mobile number used while booking.
- Admin: Orders → View → change **Order status** (Pending, Confirmed, Processing, Ready, Out for Delivery, Completed, Cancelled). A tick-box controls whether the customer is emailed. Cancelling returns stock.

## 12. Online payments (Razorpay), optional

1. Create keys at https://dashboard.razorpay.com (use **Test mode** first).
2. Put them in `.env`: `RAZORPAY_KEY_ID=...` and `RAZORPAY_KEY_SECRET=...`
3. Restart the server. A **Pay Online** option appears at checkout.

The amount is created on the server from the saved order and the payment signature is verified on the server. Without keys, Cash on Delivery and Pay at Store keep working and "Pay Online" is shown as unavailable.

## 13. Automated test

```bash
npm run test:flow
```

Runs the real app against a temporary database and checks: frames load, upload validation (including fake images), server-side pricing, checkout validation, order ID format, stock, tracking, invoice PDF, blocked admin APIs, forced password change, status updates, cancellation, size-price editing, and that secrets never reach the browser.

## 14. Build for production

```bash
npm run build      # builds client/dist
npm start          # serves API + built site on http://localhost:5000
```

Before going live:
- Set a strong `JWT_SECRET` (the server refuses to start in production without one) and `NODE_ENV=production` (done by `npm start`).
- Set `CLIENT_URL` to your real `https://` domain.
- Run behind HTTPS (Nginx, Caddy, or a platform proxy).
- Back up `data/frameshop.db` and `server/uploads/` regularly.

## Project structure

```
frame-shop/
├── client/                  React storefront + admin panel (Vite)
│   └── src/ components, pages, layouts, hooks, services, context, utils
├── server/
│   ├── controllers/         request handlers
│   ├── routes/              REST route table (all admin routes are auth-protected)
│   ├── middleware/          auth, rate limits, uploads, error handling
│   ├── services/            pricing, orders, invoice PDF, email, payments, settings
│   ├── db/                  schema.sql, seed, init
│   ├── tests/               end-to-end API test
│   ├── uploads/             customer photos, frame images, logo (git-ignored)
│   └── invoices/            stored PDF copies (git-ignored)
├── data/                    SQLite database (git-ignored)
├── .env.example
└── package.json
```

## Security summary

bcrypt password hashing; JWT auth on all admin endpoints; forced default-password change; login/order/upload/track rate limiting; Helmet headers and CSP; CORS allow-list; zod validation on every input; image uploads checked by MIME type **and file signature**, size-limited (8 MB), stored under random names and served with `nosniff`; **all prices recalculated on the server**, so client-sent prices are ignored; secrets only in `.env` or server-side settings, never sent to the browser; errors return friendly messages, never stack traces.

## Troubleshooting

- **`better-sqlite3` fails to install:** use Node 20 or 22 LTS (prebuilt binaries are published for them).
- **Port already in use:** change `PORT` in `.env` (and the proxy target in `client/vite.config.js`).
- **Images or prices not updating:** hard-refresh (Ctrl+F5).
- **Email not arriving:** use Admin → Settings → Send a test email; the error message says whether it is a login or a connection problem.
