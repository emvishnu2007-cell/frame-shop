'use strict';
// Creates all tables (idempotent). Safe to run any number of times.
const db = require('./index');
const config = require('../config');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log(`Database ready at ${config.dbFile}`);
console.log('Tables:', tables.map((t) => t.name).join(', '));
