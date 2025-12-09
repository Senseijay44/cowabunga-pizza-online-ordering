// utils/menuConfigStore.js
const { db } = require('../db');
const menuConfig = require('../config/menuConfig');

const VALID_CATEGORIES = ['sizes', 'bases', 'sauces', 'cheeses', 'toppings'];

const cloneWithAvailability = (items = []) =>
  items.map((item) => ({ ...item, isAvailable: item.isAvailable !== false }));

const DEFAULT_CONFIG = {
  sizes: cloneWithAvailability(menuConfig.SIZES),
  bases: cloneWithAvailability(menuConfig.BASES),
  sauces: cloneWithAvailability(menuConfig.SAUCES),
  cheeses: cloneWithAvailability(menuConfig.CHEESES),
  toppings: cloneWithAvailability(menuConfig.TOPPINGS),
};

const cloneConfig = (config) => ({
  sizes: (config?.sizes || []).map((item) => ({ ...item })),
  bases: (config?.bases || []).map((item) => ({ ...item })),
  sauces: (config?.sauces || []).map((item) => ({ ...item })),
  cheeses: (config?.cheeses || []).map((item) => ({ ...item })),
  toppings: (config?.toppings || []).map((item) => ({ ...item })),
});

const sanitizeConfig = (config) => {
  const safeConfig = config && typeof config === 'object' ? config : {};
  return {
    sizes: cloneWithAvailability(
      Array.isArray(safeConfig.sizes) && safeConfig.sizes.length
        ? safeConfig.sizes
        : DEFAULT_CONFIG.sizes,
    ),
    bases: cloneWithAvailability(
      Array.isArray(safeConfig.bases) && safeConfig.bases.length
        ? safeConfig.bases
        : DEFAULT_CONFIG.bases,
    ),
    sauces: cloneWithAvailability(
      Array.isArray(safeConfig.sauces) && safeConfig.sauces.length
        ? safeConfig.sauces
        : DEFAULT_CONFIG.sauces,
    ),
    cheeses: cloneWithAvailability(
      Array.isArray(safeConfig.cheeses) && safeConfig.cheeses.length
        ? safeConfig.cheeses
        : DEFAULT_CONFIG.cheeses,
    ),
    toppings: cloneWithAvailability(
      Array.isArray(safeConfig.toppings) && safeConfig.toppings.length
        ? safeConfig.toppings
        : DEFAULT_CONFIG.toppings,
    ),
  };
};

const persistConfigToDb = (config) => {
  try {
    db.prepare(
      `INSERT INTO builder_config (id, config_json)
       VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET config_json = excluded.config_json`,
    ).run(JSON.stringify(config));
  } catch (err) {
    console.warn('Warning: unable to save builder configuration to database.', err);
  }
};

const loadConfigFromDb = () => {
  try {
    const row = db.prepare('SELECT config_json FROM builder_config WHERE id = 1').get();
    if (!row?.config_json) {
      throw new Error('Missing builder_config row');
    }

    const parsed = JSON.parse(row.config_json);
    return sanitizeConfig(parsed);
  } catch (err) {
    console.warn('Warning: loading builder configuration failed, using defaults.', err);
    persistConfigToDb(DEFAULT_CONFIG);
    return sanitizeConfig(DEFAULT_CONFIG);
  }
};

let state = loadConfigFromDb();

const persistCurrentState = () => {
  persistConfigToDb(state);
};

const priceKeyForCategory = (category) => {
  switch (category) {
    case 'sizes':
      return 'priceModifier';
    case 'bases':
      return 'basePrice';
    default:
      return 'price';
  }
};

const cloneItem = (item) => ({ ...item });

const getCategory = (category) => {
  if (!VALID_CATEGORIES.includes(category)) return null;
  return state[category];
};

const generateId = (category, name) => {
  const baseSlug = (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `${category}-item`;

  let slug = baseSlug;
  let counter = 1;
  const items = getCategory(category) || [];
  while (items.some((item) => String(item.id) === slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
};

const getBuilderConfig = () => cloneConfig(state);

const updateBuilderConfig = (newConfig) => {
  state = sanitizeConfig(newConfig);
  persistCurrentState();
  return getBuilderConfig();
};

const getAllMenuConfig = () => getBuilderConfig();

const getAvailableMenuConfig = () => ({
  sizes: state.sizes.filter((item) => item.isAvailable !== false).map(cloneItem),
  bases: state.bases.filter((item) => item.isAvailable !== false).map(cloneItem),
  sauces: state.sauces.filter((item) => item.isAvailable !== false).map(cloneItem),
  cheeses: state.cheeses.filter((item) => item.isAvailable !== false).map(cloneItem),
  toppings: state.toppings.filter((item) => item.isAvailable !== false).map(cloneItem),
});

const getCategoryItems = (category) => {
  const items = getCategory(category);
  return items ? items.map(cloneItem) : [];
};

const upsertCategoryItem = (category, { id, name, price, isAvailable = true }) => {
  const items = getCategory(category);
  if (!items) {
    throw new Error('Invalid category');
  }

  if (!name) {
    throw new Error('Name is required');
  }

  const priceKey = priceKeyForCategory(category);
  const priceValue = price === '' || price === undefined ? null : Number(price);
  if (priceValue !== null && !Number.isFinite(priceValue)) {
    throw new Error('Price must be a number');
  }

  const index = id !== undefined ? items.findIndex((item) => String(item.id) === String(id)) : -1;
  const base = index >= 0 ? { ...items[index] } : { id: id || generateId(category, name) };

  const updated = {
    ...base,
    name,
    isAvailable: Boolean(isAvailable),
  };

  if (priceValue !== null) {
    updated[priceKey] = priceValue;
  } else if (updated[priceKey] === undefined) {
    updated[priceKey] = priceKey === 'priceModifier' ? 1 : 0;
  }

  if (index >= 0) {
    items[index] = updated;
  } else {
    items.push(updated);
  }

  persistCurrentState();

  return { ...updated };
};

const deleteCategoryItem = (category, id) => {
  const items = getCategory(category);
  if (!items) return false;

  const index = items.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return false;

  items.splice(index, 1);
  persistCurrentState();
  return true;
};

module.exports = {
  getBuilderConfig,
  updateBuilderConfig,
  getAllMenuConfig,
  getAvailableMenuConfig,
  getCategoryItems,
  upsertCategoryItem,
  deleteCategoryItem,
  VALID_CATEGORIES,
};
