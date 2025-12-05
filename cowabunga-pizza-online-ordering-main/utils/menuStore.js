// utils/menuStore.js
const presetPizzas = require('../config/presetPizzas');

const MENU_ITEM_CATEGORIES = ['pizza', 'side', 'drink', 'dessert'];

let menuItems = presetPizzas.map((item) => ({
  ...item,
  category: MENU_ITEM_CATEGORIES.includes(item.category) ? item.category : 'pizza',
  imageUrl: item.imageUrl || '',
  isAvailable: item.isAvailable !== false,
}));

const getNextId = () => {
  const maxId = menuItems.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  return maxId + 1;
};

const getMenuItems = () => menuItems.map((item) => ({ ...item }));

const getAvailableMenuItems = () =>
  menuItems
    .filter((item) => item.isAvailable !== false)
    .map((item) => ({ ...item }));

const getMenuItemById = (id) => {
  const numericId = Number(id);
  return menuItems.find((item) => item.id === numericId) || null;
};

const normalizeCategory = (category) =>
  MENU_ITEM_CATEGORIES.includes(category) ? category : 'pizza';

const addMenuItem = ({
  name,
  description = '',
  price,
  isAvailable = true,
  category = 'pizza',
  imageUrl = '',
}) => {
  const newItem = {
    id: getNextId(),
    name,
    description,
    price,
    category: normalizeCategory(category),
    imageUrl,
    isAvailable: Boolean(isAvailable),
  };

  menuItems.push(newItem);
  return { ...newItem };
};

const updateMenuItem = (id, updates = {}) => {
  const numericId = Number(id);
  const index = menuItems.findIndex((item) => item.id === numericId);

  if (index === -1) {
    return null;
  }

  const merged = {
    ...menuItems[index],
    ...updates,
    id: numericId,
    category: updates.category
      ? normalizeCategory(updates.category)
      : menuItems[index].category || 'pizza',
    imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : menuItems[index].imageUrl,
    isAvailable:
      updates.isAvailable === undefined
        ? menuItems[index].isAvailable !== false
        : Boolean(updates.isAvailable),
  };

  menuItems[index] = merged;
  return { ...merged };
};

const deleteMenuItem = (id) => {
  const numericId = Number(id);
  const index = menuItems.findIndex((item) => item.id === numericId);

  if (index === -1) {
    return false;
  }

  menuItems.splice(index, 1);
  return true;
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
