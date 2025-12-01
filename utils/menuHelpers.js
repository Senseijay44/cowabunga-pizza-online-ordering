// utils/menuHelpers.js

/**
 * Find a menu item by its id or optional alternate id.
 * @param {Array} list
 * @param {string|number} id
 * @returns {Object|null}
 */
function findMenuItemById(list, id) {
  if (!Array.isArray(list) || !id) return null;
  return list.find((item) => item.id === id || item.idAlt === id) || null;
}

/**
 * Find a menu item by id, falling back to a default id when missing.
 * @param {Array} list
 * @param {string|number} id
 * @param {string|number} defaultId
 * @returns {Object|null}
 */
function findMenuItemOrDefault(list, id, defaultId) {
  const resolvedId = id || defaultId;
  return findMenuItemById(list, resolvedId);
}

module.exports = {
  findMenuItemById,
  findMenuItemOrDefault,
};
