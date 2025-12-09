// utils/menuStore.js
const { db, seedMenuItems } = require('../db');
const presetPizzas = require('../config/presetPizzas');

const MENU_ITEM_CATEGORIES = ['pizza', 'side', 'drink', 'dessert'];

let seeded = false;

const normalizeCategory = (category) =>
  MENU_ITEM_CATEGORIES.includes(category) ? category : 'pizza';

const normalizeImageUrl = (value, { allowEmpty = false } = {}) => {
  if (value === undefined || value === null) return allowEmpty ? '' : undefined;

  const trimmed = String(value).trim();
  if (!trimmed) return allowEmpty ? '' : undefined;

  // Absolute URLs (http/https) and leading slashes are left as-is
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }

  // Normalize relative paths to live under the /images public directory
  const sanitized = trimmed.replace(/^\.?(\/)+/, '');
  return `/${sanitized}`;
};

const mapRowToItem = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  price: Number(row.price) || 0,
  category: normalizeCategory(row.category),
  imageUrl: normalizeImageUrl(row.image_url, { allowEmpty: true }),
  isAvailable: row.is_active !== 0,
});

const ensureSeeded = () => {
  if (seeded) return;
  seedMenuItems(presetPizzas);
  seeded = true;
};

const getMenuItems = () => {
  ensureSeeded();
  const rows = db.prepare('SELECT * FROM menu_items ORDER BY id ASC').all();
  return rows.map(mapRowToItem);
};

const getAvailableMenuItems = () => {
  ensureSeeded();
  const rows = db
    .prepare('SELECT * FROM menu_items WHERE is_active = 1 ORDER BY id ASC')
    .all();
  return rows.map(mapRowToItem);
};

const getMenuItemById = (id) => {
  ensureSeeded();
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;
  const row = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(numericId);
  return row ? mapRowToItem(row) : null;
};

const addMenuItem = ({
  name,
  description = '',
  price,
  isAvailable = true,
  category = 'pizza',
  imageUrl = '',
}) => {
  ensureSeeded();
  const normalizedImageUrl = normalizeImageUrl(imageUrl, { allowEmpty: true });
  const info = db
    .prepare(
      `
        INSERT INTO menu_items (name, description, price, category, image_url, is_active)
        VALUES (@name, @description, @price, @category, @image_url, @is_active)
      `
    )
    .run({
      name,
      description,
      price: Number(price) || 0,
      category: normalizeCategory(category),
      image_url: normalizedImageUrl || '',
      is_active: isAvailable ? 1 : 0,
    });

  return getMenuItemById(info.lastInsertRowid);
};

const updateMenuItem = (id, updates = {}) => {
  ensureSeeded();
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;

  const existing = getMenuItemById(numericId);
  if (!existing) return null;

  const normalizedImageUrl = normalizeImageUrl(updates.imageUrl, { allowEmpty: false });

  const merged = {
    ...existing,
    ...updates,
    category:
      updates.category !== undefined
        ? normalizeCategory(updates.category)
        : existing.category,
    imageUrl: normalizedImageUrl !== undefined ? normalizedImageUrl : existing.imageUrl,
    isAvailable:
      updates.isAvailable === undefined ? existing.isAvailable !== false : Boolean(updates.isAvailable),
    price: updates.price !== undefined ? Number(updates.price) : existing.price,
  };

  db.prepare(
    `
      UPDATE menu_items
      SET name = @name,
          description = @description,
          price = @price,
          category = @category,
          image_url = @image_url,
          is_active = @is_active
      WHERE id = @id
    `
  ).run({
    id: numericId,
    name: merged.name,
    description: merged.description,
    price: Number(merged.price) || 0,
    category: merged.category,
    image_url: merged.imageUrl || '',
    is_active: merged.isAvailable ? 1 : 0,
  });

  return getMenuItemById(numericId);
};

const deleteMenuItem = (id) => {
  ensureSeeded();
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return false;
  const result = db.prepare('DELETE FROM menu_items WHERE id = ?').run(numericId);
  return result.changes > 0;
};

module.exports = {
  MENU_ITEM_CATEGORIES,
  getMenuItems,
  getAvailableMenuItems,
  getMenuItemById,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
