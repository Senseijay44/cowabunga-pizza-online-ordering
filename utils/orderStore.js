// utils/orderStore.js

let nextOrderId = 1;
const orders = [];

/**
 * Create a new order and store it in memory.
 * @param {Object} payload
 * @param {Object} payload.customer - { name, phone, address }
 * @param {Array} payload.items - cart items
 * @param {Object} payload.totals - { subtotal, tax, total }
 */
function createOrder({ customer, items, totals }) {
  const order = {
    id: nextOrderId++,
    customer,
    items,
    totals,
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  return order;
}

function getOrderById(id) {
  const numericId = Number(id);
  return orders.find((o) => o.id === numericId) || null;
}

module.exports = {
  createOrder,
  getOrderById,
};
