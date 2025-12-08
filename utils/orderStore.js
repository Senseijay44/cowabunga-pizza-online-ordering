// utils/orderStore.js
const fs = require('fs');
const path = require('path');
const { db } = require('../db');

const orderFilePath = path.resolve(__dirname, '..', 'data', 'orders.json');

// Status workflow: Pending -> Preparing -> Ready -> Complete
const STATUS = {
  PENDING: 'Pending',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETE: 'Complete',
};

const insertOrderStmt = db.prepare(`
  INSERT INTO orders (
    subtotal, tax, total, item_count,
    customer_name, customer_phone, customer_address, customer_email,
    fulfillment_method, status, items_json, created_at, updated_at
  ) VALUES (
    @subtotal, @tax, @total, @item_count,
    @customer_name, @customer_phone, @customer_address, @customer_email,
    @fulfillment_method, @status, @items_json, @created_at, @updated_at
  )
`);

const selectOrderStmt = db.prepare('SELECT * FROM orders WHERE id = ?');
const selectAllOrdersStmt = db.prepare(
  'SELECT * FROM orders ORDER BY datetime(created_at) DESC, id DESC'
);

const computeItemCount = (items) =>
  Array.isArray(items)
    ? items.reduce((sum, item) => sum + Number(item?.qty || 0), 0)
    : 0;

const mapRowToOrder = (row) => {
  const items = row.items_json ? JSON.parse(row.items_json) : [];
  return {
    id: row.id,
    customer: {
      name: row.customer_name || '',
      phone: row.customer_phone || '',
      address: row.customer_address || '',
      email: row.customer_email || '',
    },
    items,
    totals: {
      subtotal: Number(row.subtotal) || 0,
      tax: Number(row.tax) || 0,
      total: Number(row.total) || 0,
    },
    fulfillmentMethod: row.fulfillment_method === 'delivery' ? 'delivery' : 'pickup',
    status: row.status || STATUS.PENDING,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: Number(row.item_count) || computeItemCount(items),
  };
};

const migrateLegacyOrders = () => {
  const existing = db.prepare('SELECT COUNT(1) AS count FROM orders').get();
  if (existing?.count > 0) {
    // Table already has rows, skip migration.
    return;
  }

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
    console.warn('orders.json contains invalid JSON, skipping migration.', err);
    return;
  }

  if (!Array.isArray(savedOrders) || savedOrders.length === 0) {
    return;
  }

  const migrationTx = db.transaction((orders) => {
    orders.forEach((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      const totals = order.totals || {};
      const created = order.createdAt || new Date().toISOString();
      const updated = order.updatedAt || created;

      insertOrderStmt.run({
        subtotal: Number(totals.subtotal) || 0,
        tax: Number(totals.tax) || 0,
        total: Number(totals.total) || 0,
        item_count: computeItemCount(items),
        customer_name: order.customer?.name || '',
        customer_phone: order.customer?.phone || '',
        customer_address: order.customer?.address || '',
        customer_email: order.customer?.email || '',
        fulfillment_method:
          order.fulfillmentMethod === 'delivery' ? 'delivery' : 'pickup',
        status: order.status || STATUS.PENDING,
        items_json: JSON.stringify(items),
        created_at: created,
        updated_at: updated,
      });
    });
  });

  migrationTx(savedOrders);
};

migrateLegacyOrders();

/**
 * Create a new order and store it in SQLite.
 * @param {Object} payload
 * @param {Object} payload.customer - { name, phone, address }
 * @param {Array} payload.items - cart items
 * @param {Object} payload.totals - { subtotal, tax, total }
 * @param {'pickup'|'delivery'} [payload.fulfillmentMethod]
 * @param {number} [payload.itemCount] - optional item count override
 */
function createOrder({ customer, items, totals, fulfillmentMethod = 'pickup', itemCount, status }) {
  const now = new Date().toISOString();
  const normalizedItems = Array.isArray(items) ? items : [];
  const count = Number(itemCount) || computeItemCount(normalizedItems);

  const info = insertOrderStmt.run({
    subtotal: Number(totals?.subtotal) || 0,
    tax: Number(totals?.tax) || 0,
    total: Number(totals?.total) || 0,
    item_count: count,
    customer_name: customer?.name || '',
    customer_phone: customer?.phone || '',
    customer_address: customer?.address || '',
    customer_email: customer?.email || '',
    fulfillment_method: fulfillmentMethod === 'delivery' ? 'delivery' : 'pickup',
    status: status || STATUS.PENDING,
    items_json: JSON.stringify(normalizedItems),
    created_at: now,
    updated_at: now,
  });

  return getOrderById(info.lastInsertRowid);
}

function getOrderById(id) {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) return null;
  const row = selectOrderStmt.get(numericId);
  return row ? mapRowToOrder(row) : null;
}

/**
 * Get all orders (most recent first).
 */
function getAllOrders() {
  const rows = selectAllOrdersStmt.all();
  return rows.map(mapRowToOrder);
}

/**
 * Update the status of an order.
 * @param {number|string} id - order id
 * @param {string} newStatus - one of STATUS values
 * @returns {Object|null} updated order or null if not found
 */
function updateOrderStatus(id, newStatus) {
  const allowedStatuses = Object.values(STATUS);
  if (!allowedStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return null;
  }

  const now = new Date().toISOString();
  const result = db
    .prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
    .run(newStatus, now, numericId);

  if (result.changes === 0) {
    return null;
  }

  return getOrderById(numericId);
}

module.exports = {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  STATUS,
};
