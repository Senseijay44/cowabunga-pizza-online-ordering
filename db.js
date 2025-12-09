const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const menuConfig = require('./config/menuConfig');

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

// Basic pragmas to keep the embedded DB fast and safe for this use case
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL,
      total REAL NOT NULL,
      item_count INTEGER NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      customer_address TEXT,
      customer_email TEXT,
      fulfillment_method TEXT,
      status TEXT,
      items_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT,
      image_url TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS builder_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config_json TEXT NOT NULL
    );
  `);
}

initializeSchema();

const cloneWithAvailability = (items = []) =>
  items.map((item) => ({ ...item, isAvailable: item.isAvailable !== false }));

function buildDefaultBuilderConfig() {
  return {
    sizes: cloneWithAvailability(menuConfig.SIZES),
    bases: cloneWithAvailability(menuConfig.BASES),
    sauces: cloneWithAvailability(menuConfig.SAUCES),
    cheeses: cloneWithAvailability(menuConfig.CHEESES),
    toppings: cloneWithAvailability(menuConfig.TOPPINGS),
  };
}

function seedBuilderConfig() {
  try {
    const countRow = db.prepare('SELECT COUNT(1) AS count FROM builder_config').get();
    if (countRow?.count > 0) {
      return;
    }

    const defaultConfig = buildDefaultBuilderConfig();
    db.prepare(
      'INSERT INTO builder_config (id, config_json) VALUES (1, ?)',
    ).run(JSON.stringify(defaultConfig));
  } catch (err) {
    console.warn('Warning: unable to seed builder_config table', err);
  }
}

seedBuilderConfig();

function seedMenuItems(initialItems = []) {
  const countRow = db.prepare('SELECT COUNT(1) AS count FROM menu_items').get();
  if (countRow?.count > 0) {
    return;
  }

  if (!Array.isArray(initialItems) || !initialItems.length) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO menu_items (id, name, description, price, category, image_url, is_active)
    VALUES (@id, @name, @description, @price, @category, @image_url, @is_active)
  `);

  const seedTx = db.transaction((items) => {
    items.forEach((item) => {
      insert.run({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: Number(item.price) || 0,
        category: item.category || 'pizza',
        image_url: item.imageUrl || '',
        is_active: item.isAvailable === false ? 0 : 1,
      });
    });
  });

  seedTx(initialItems);
}

module.exports = { db, seedMenuItems };
