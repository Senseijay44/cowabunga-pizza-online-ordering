// utils/menuConfigStore.js
const menuConfig = require('../config/menuConfig');

const VALID_CATEGORIES = ['sizes', 'bases', 'sauces', 'cheeses', 'toppings'];

const cloneWithAvailability = (items = []) =>
  items.map((item) => ({ ...item, isAvailable: item.isAvailable !== false }));

const state = {
  sizes: cloneWithAvailability(menuConfig.SIZES),
  bases: cloneWithAvailability(menuConfig.BASES),
  sauces: cloneWithAvailability(menuConfig.SAUCES),
  cheeses: cloneWithAvailability(menuConfig.CHEESES),
  toppings: cloneWithAvailability(menuConfig.TOPPINGS),
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

const getAllMenuConfig = () => ({
  sizes: state.sizes.map(cloneItem),
  bases: state.bases.map(cloneItem),
  sauces: state.sauces.map(cloneItem),
  cheeses: state.cheeses.map(cloneItem),
  toppings: state.toppings.map(cloneItem),
});

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

  return { ...updated };
};

const deleteCategoryItem = (category, id) => {
  const items = getCategory(category);
  if (!items) return false;

  const index = items.findIndex((item) => String(item.id) === String(id));
  if (index === -1) return false;

  items.splice(index, 1);
  return true;
};

module.exports = {
  getAllMenuConfig,
  getAvailableMenuConfig,
  getCategoryItems,
  upsertCategoryItem,
  deleteCategoryItem,
  VALID_CATEGORIES,
};
