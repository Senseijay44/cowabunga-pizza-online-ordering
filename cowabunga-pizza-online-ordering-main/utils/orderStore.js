// utils/orderStore.js
const fs = require('fs');
const path = require('path');

const orderFilePath = path.resolve(__dirname, '..', 'data', 'orders.json');

let nextOrderId = 1;
const orders = [];

// Status workflow: Pending → Preparing → Ready → Complete
const STATUS = {
  PENDING: 'Pending',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETE: 'Complete',
};

function ensureOrdersDir() {
  fs.mkdirSync(path.dirname(orderFilePath), { recursive: true });
}

function saveOrdersSync() {
  try {
    ensureOrdersDir();
    fs.writeFileSync(orderFilePath, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save orders to disk:', err);
  }
}

function isValidOrder(order) {
  const hasValidId = Number.isFinite(order?.id);
  const hasValidTotals = Number.isFinite(order?.totals?.total);
  const hasItemsArray = Array.isArray(order?.items);
  const hasCustomer = !!order?.customer && typeof order.customer === 'object';

  return hasValidId && hasValidTotals && hasItemsArray && hasCustomer;
}

function loadOrdersFromDisk() {
  orders.length = 0;
  nextOrderId = 1;

  try {
    if (!fs.existsSync(orderFilePath)) {
      return;
    }

    const contents = fs.readFileSync(orderFilePath, 'utf8');
    if (!contents.trim()) {
      return;
    }

    let savedOrders;
    try {
      savedOrders = JSON.parse(contents);
    } catch (err) {
      console.warn('orders.json contains invalid JSON. Starting with empty orders.', err);
      return;
    }

    if (!Array.isArray(savedOrders)) {
      console.warn('orders.json is not an array. Starting with empty orders.');
      return;
    }

    let maxExistingId = 0;
    savedOrders.forEach((order, index) => {
      if (isValidOrder(order)) {
        orders.push(order);
        if (order.id > maxExistingId) {
          maxExistingId = order.id;
        }
      } else {
        console.warn(`Skipping invalid order at index ${index} in orders.json`);
      }
    });

    nextOrderId = orders.length ? maxExistingId + 1 : 1;
  } catch (err) {
    console.error('Failed to load orders from disk:', err);
    orders.length = 0;
    nextOrderId = 1;
  }
}

/**
 * Create a new order and store it in memory.
 * @param {Object} payload
 * @param {Object} payload.customer - { name, phone, address }
 * @param {Array} payload.items - cart items
 * @param {Object} payload.totals - { subtotal, tax, total }
 * @param {'pickup'|'delivery'} [payload.fulfillmentMethod]
 */
function createOrder({ customer, items, totals, fulfillmentMethod = 'pickup' }) {
  const now = new Date().toISOString();

  const order = {
    id: nextOrderId++,
    customer,
    items: Array.isArray(items) ? items : [],
    totals: totals || { subtotal: 0, tax: 0, total: 0 },
    fulfillmentMethod: fulfillmentMethod === 'delivery' ? 'delivery' : 'pickup',
    status: STATUS.PENDING,
    createdAt: now,
    updatedAt: now,
  };

  orders.push(order);
  saveOrdersSync();
  return order;
}

function getOrderById(id) {
  const numericId = Number(id);
  return orders.find((o) => o.id === numericId) || null;
}

/**
 * Get all orders (most recent first).
 */
function getAllOrders() {
  // shallow copy so no one mutates the internal array by accident
  return [...orders].sort((a, b) => b.id - a.id);
}

/**
 * Update the status of an order.
 * @param {number|string} id - order id
 * @param {string} newStatus - one of STATUS values
 * @returns {Object|null} updated order or null if not found
 */
function updateOrderStatus(id, newStatus) {
  const order = getOrderById(id);
  if (!order) {
    return null;
  }

  const allowedStatuses = Object.values(STATUS);
  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  order.status = newStatus;
  order.updatedAt = new Date().toISOString();
  saveOrdersSync();
  return order;
}

loadOrdersFromDisk();

module.exports = {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  STATUS,
};
