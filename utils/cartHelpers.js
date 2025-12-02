// utils/cartHelpers.js

const menuConfig = require('../config/menuConfig');
const { findMenuItemById } = require('./menuHelpers');

const DEFAULT_TAX_RATE = 0.086;

function sanitizeCustomer(customer = {}) {
  const name = customer.name && String(customer.name).trim();
  const phone = customer.phone && String(customer.phone).trim();
  const address = customer.address && String(customer.address).trim();
  const email = customer.email ? String(customer.email).trim() : null;

  return { name, phone, address, email };
}

/**
 * Normalize cart items into a safe, serializable structure.
 * @param {Array} cart
 * @returns {Array}
 */
function normalizeCartItems(cart) {
  if (!Array.isArray(cart)) return [];

  return cart
    .map((item) => {
      const price = Number(item.price);
      const qty = Number(item.qty || 1);

      if (!Number.isFinite(price) || price <= 0) {
        return null;
      }

      if (!Number.isFinite(qty) || qty <= 0) {
        return null;
      }

      return {
        name: String(item.name || 'Custom Pizza'),
        meta: String(item.meta || ''),
        price,
        qty,
      };
    })
    .filter(Boolean);
}

/**
 * Compute subtotal, tax, and total for a cart without mutating it.
 * @param {Array} cart
 * @param {number} taxRate
 */
function computeTotals(cart, taxRate = DEFAULT_TAX_RATE) {
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1),
    0
  );

  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return { subtotal, tax, total };
}

/**
 * Build a human-readable description for a custom pizza configuration.
 * @param {Object} param0
 * @param {string} param0.sizeId
 * @param {string} param0.baseId
 * @param {string} param0.sauceId
 * @param {string} param0.cheeseId
 * @param {Array<string>} param0.toppingIds
 * @returns {string}
 */
function buildCustomPizzaMeta({ sizeId, baseId, sauceId, cheeseId, toppingIds }) {
  const { SIZES, BASES, SAUCES, CHEESES, TOPPINGS } = menuConfig;
  const parts = [];

  const size = findMenuItemById(SIZES, sizeId);
  const base = findMenuItemById(BASES, baseId);
  const sauce = findMenuItemById(SAUCES, sauceId);
  const cheese = findMenuItemById(CHEESES, cheeseId);

  if (size) parts.push(size.name);
  if (base) parts.push(base.name);
  if (sauce) parts.push(sauce.name);
  if (cheese) parts.push(cheese.name);

  const toppingObjs = (Array.isArray(toppingIds) ? toppingIds : [toppingIds])
    .filter(Boolean)
    .map((id) => findMenuItemById(TOPPINGS, id))
    .filter(Boolean);

  if (toppingObjs.length > 0) {
    const toppingNames = toppingObjs.map((t) => t.name).join(', ');
    parts.push(`Toppings: ${toppingNames}`);
  }

  return parts.join(' | ');
}

/**
 * Build a normalized order payload from raw request inputs.
 * Returns an object with either { order } or { error }.
 */
function buildOrderPayload({ customer, cart, fulfillmentMethod, taxRate = DEFAULT_TAX_RATE }) {
  const normalizedMethod = fulfillmentMethod === 'delivery' ? 'delivery' : 'pickup';
  const { name, phone, address, email } = sanitizeCustomer(customer);

  if (!name || !phone) {
    return { error: 'Missing customer name or phone' };
  }

  if (normalizedMethod === 'delivery' && !address) {
    return { error: 'Address is required for delivery' };
  }

  const items = normalizeCartItems(cart);

  if (items.length === 0) {
    return { error: 'Cart is empty or invalid' };
  }

  const totals = computeTotals(items, taxRate);

  return {
    order: {
      customer: {
        name,
        phone,
        address: address || '',
        email,
      },
      items,
      totals,
      fulfillmentMethod: normalizedMethod,
    },
  };
}

module.exports = {
  DEFAULT_TAX_RATE,
  normalizeCartItems,
  computeTotals,
  sanitizeCustomer,
  buildOrderPayload,
  buildCustomPizzaMeta,
};
