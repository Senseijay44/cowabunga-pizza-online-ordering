// utils/orderStore.js

let nextOrderId = 1;
const orders = [];

// Status workflow: Pending → Preparing → Ready → Complete
const STATUS = {
  PENDING: 'Pending',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETE: 'Complete',
};

/**
 * Create a new order and store it in memory.
 * @param {Object} payload
 * @param {Object} payload.customer - { name, phone, address }
 * @param {Array} payload.items - cart items
 * @param {Object} payload.totals - { subtotal, tax, total }
 */
function createOrder({ customer, items, totals }) {
  const now = new Date().toISOString();

  const order = {
    id: nextOrderId++,
    customer,
    items: Array.isArray(items) ? items : [],
    totals: totals || { subtotal: 0, tax: 0, total: 0 },
    status: STATUS.PENDING,
    createdAt: now,
    updatedAt: now,
  };

  orders.push(order);
  return order;
}

function getOrderById(id) {
  const numericId = Number(id);
  return orders.find((o) => o.id === numericId) || null;
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
  return order;
}

module.exports = {
  createOrder,
  getOrderById,
  updateOrderStatus,
  STATUS,
};
