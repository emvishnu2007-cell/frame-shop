'use strict';
const config = require('./config');
const db = require('./db');
const bcrypt = require('bcryptjs');
const { createApp } = require('./app');

/** First-run convenience: make sure an admin exists so you can always sign in. */
function ensureAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM admins').get().n;
  if (count === 0) {
    db.prepare('INSERT INTO admins (email, name, password_hash, must_change_password) VALUES (?,?,?,1)')
      .run(config.admin.email, 'Administrator', bcrypt.hashSync(config.admin.password, 12));
    console.log(`Created default admin: ${config.admin.email} (you will be asked to change the password on first login)`);
  }
}

ensureAdmin();

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`Frame Shop API running on http://localhost:${config.port}`);
  if (!config.isProd) console.log(`Storefront (Vite) on ${config.clientUrl}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => server.close(() => { db.close(); process.exit(0); }));
}
