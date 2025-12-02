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

function persistOrders() {
  try {
    fs.mkdirSync(path.dirname(orderFilePath), { recursive: true });
    fs.writeFile(orderFilePath, JSON.stringify(orders, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Failed to save orders to disk:', err);
      }
    });
  } catch (err) {
    console.error('Failed to prepare order persistence:', err);
  }
}

function loadOrdersFromDisk() {
  try {
    if (!fs.existsSync(orderFilePath)) {
      return;
    }

    const contents = fs.readFileSync(orderFilePath, 'utf8');
    if (!contents.trim()) {
      return;
    }

    const savedOrders = JSON.parse(contents);
    if (Array.isArray(savedOrders)) {
      orders.push(...savedOrders);
      const maxExistingId = orders.reduce((max, order) => {
        return typeof order.id === 'number' && order.id > max ? order.id : max;
      }, 0);
      nextOrderId = Math.max(nextOrderId, maxExistingId + 1);
    }
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
  persistOrders();
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
  persistOrders();
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
