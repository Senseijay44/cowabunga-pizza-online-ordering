// utils/menuStore.js
const presetPizzas = require('../config/presetPizzas');

let menuItems = presetPizzas.map((item) => ({ ...item }));

const getNextId = () => {
  const maxId = menuItems.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  return maxId + 1;
};

const getMenuItems = () => menuItems.map((item) => ({ ...item }));

const getMenuItemById = (id) => {
  const numericId = Number(id);
  return menuItems.find((item) => item.id === numericId) || null;
};

const addMenuItem = ({ name, description = '', price }) => {
  const newItem = {
    id: getNextId(),
    name,
    description,
    price,
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
  getMenuItems,
  getMenuItemById,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
