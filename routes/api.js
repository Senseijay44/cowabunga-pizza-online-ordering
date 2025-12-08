// routes/api.js
const express = require('express');
const router = express.Router();

const menuConfig = require('../config/menuConfig.js');
const {
  getAvailableMenuConfig,
} = require('../utils/menuConfigStore');
const { calculatePizzaPrice } = require('../utils/pizzaPricing.js');
const {
  DEFAULT_TAX_RATE,
  buildCustomPizzaMeta,
  buildOrderPayload,
  computeTotals,
  normalizeCartItems,
} = require('../utils/cartHelpers');
const {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  STATUS,
} = require('../utils/orderStore');
const {
  getMenuItems,
  getAvailableMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  MENU_ITEM_CATEGORIES,
} = require('../utils/menuStore');
const { getCartFromSession } = require('../utils/cartSession');

const { requireAdminApi } = require('../middleware/auth');

const ALLOWED_STATUSES = Object.values(STATUS);

// ------------------------------------------------------
// Menu + Pricing
// ------------------------------------------------------

// Admin: CRUD endpoints for preset menu items
router.get('/admin/menu', requireAdminApi, (req, res) => {
  res.json({ items: getMenuItems() });
});

router.post('/admin/menu', requireAdminApi, express.json(), (req, res) => {
  const { name, description = '', price, isAvailable = true, category, imageUrl = '' } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  if (!MENU_ITEM_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const created = addMenuItem({
    name: name.trim(),
    description: description.trim(),
    price: priceNum,
    category,
    imageUrl: imageUrl.trim(),
    isAvailable,
  });

  return res.status(201).json({ item: created });
});

router.put('/admin/menu/:id', requireAdminApi, express.json(), (req, res) => {
  const { id } = req.params;
  const { name, description = '', price, isAvailable = true, category, imageUrl = '' } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  if (!MENU_ITEM_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const updated = updateMenuItem(id, {
    name: name.trim(),
    description: description.trim(),
    price: priceNum,
    category,
    imageUrl: imageUrl.trim(),
    isAvailable,
  });

  if (!updated) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  return res.json({ item: updated });
});

router.delete('/admin/menu/:id', requireAdminApi, (req, res) => {
  const { id } = req.params;

  const deleted = deleteMenuItem(id);

  if (!deleted) {
    return res.status(404).json({ error: 'Menu item not found' });
  }

  return res.json({ success: true });
});

// GET /api/menu – full menu config for builder + preset pizzas
router.get('/menu', (req, res) => {
  const availableConfig = getAvailableMenuConfig();

  res.json({
    sizes: availableConfig.sizes,
    bases: availableConfig.bases,
    sauces: availableConfig.sauces,
    cheeses: availableConfig.cheeses,
    toppings: availableConfig.toppings,
    rules: menuConfig.BUILDER_RULES,
    presetPizzas: getAvailableMenuItems(),
  });
});

// POST /api/price – calculate price for a pizza config
router.post('/price', express.json(), (req, res) => {
  try {
    const pizzaState = req.body; // { sizeId, baseId, sauceId, cheeseId, toppings[], quantity }
    const pricing = calculatePizzaPrice(pizzaState);
    res.json(pricing);
  } catch (err) {
    console.error('Price calculation error:', err?.message || err, req.body);
    res.status(400).json({ error: err?.message || 'Invalid pizza configuration' });
  }
});

// ------------------------------------------------------
// Checkout + Orders
// ------------------------------------------------------

/**
 * EP-004: Checkout API
 * POST /api/checkout
 * Expects JSON:
 * {
 *   customer: { name, phone, address, email? },
 *   cart: [...],
 *   fulfillmentMethod: "pickup" | "delivery"
 * }
 * Totals are recomputed on the server.
 */
router.post('/checkout', express.json(), (req, res) => {
  try {
    const { customer, cart, fulfillmentMethod } = req.body || {};
    const { order, error } = buildOrderPayload({
      customer,
      cart,
      fulfillmentMethod,
      taxRate: DEFAULT_TAX_RATE,
    });

    if (error) {
      return res.status(400).json({ error });
    }

    const itemCount = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
      : 0;

    const created = createOrder({ ...order, itemCount });

    if (req.session) {
      req.session.cart = [];
    }

    return res.status(201).json({
      message: 'Order created',
      orderId: created.id,
    });
  } catch (err) {
    console.error('Checkout API error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /api/orders/:id – simple order tracking
router.get('/orders/:id', (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  const order = getOrderById(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Simple tracking payload – can be extended in later sprints
  return res.json({
    orderId: order.id,
    status: order.status,
    placedAt: order.createdAt,
    estimatedMinutes: 30,
  });
});

// GET /api/orders/:id/details – full order details (for future admin UI)
router.get('/orders/:id/details', (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  const order = getOrderById(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Return the full stored order object
  return res.json(order);
});

// PATCH /api/orders/:id/status – admin-only status updates
router.patch('/orders/:id/status', requireAdminApi, express.json(), (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  const updated = updateOrderStatus(id, status);

  if (!updated) {
    return res.status(404).json({ error: 'Order not found' });
  }

  return res.json({
    orderId: updated.id,
    status: updated.status,
    updatedAt: updated.updatedAt,
  });
});

// ------------------------------------------------------
// Admin reporting
// ------------------------------------------------------

const toCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  return /[",\n]/.test(str) ? `"${str}"` : str;
};

router.get('/admin/report', requireAdminApi, (req, res) => {
  try {
    const orders = getAllOrders();
    const rows = orders.map((order) => {
      const itemCount =
        order.itemCount ||
        (Array.isArray(order.items)
          ? order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
          : 0);

      return {
        orderId: order.id,
        subtotal: Number(order.totals?.subtotal || 0).toFixed(2),
        tax: Number(order.totals?.tax || 0).toFixed(2),
        total: Number(order.totals?.total || 0).toFixed(2),
        itemCount,
        createdAt: order.createdAt,
      };
    });

    const header = ['orderId', 'subtotal', 'tax', 'total', 'itemCount', 'createdAt'];
    const csvLines = [header.map(toCsvValue).join(',')];
    rows.forEach((row) => {
      csvLines.push(
        [
          row.orderId,
          row.subtotal,
          row.tax,
          row.total,
          row.itemCount,
          row.createdAt,
        ]
          .map(toCsvValue)
          .join(',')
      );
    });

    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="orders-report.csv"');
    return res.send(csvLines.join('\n'));
  } catch (err) {
    console.error('Failed to generate CSV report:', err);
    return res.status(500).json({ error: 'Unable to generate report' });
  }
});

// ------------------------------------------------------
// Cart (session-based)
// ------------------------------------------------------

// POST /api/cart/items – add item to cart
router.post('/cart/items', express.json(), (req, res) => {
  const { type } = req.body || {};

  // Branch 1: Custom pizza from builder
  if (type === 'custom') {
    try {
      const {
        sizeId,
        baseId,
        sauceId,
        cheeseId,
        toppingIds,
        quantity,
      } = req.body;

      const qtyNum = Number(quantity || 1);
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
        return res.status(400).json({ error: 'Invalid quantity value' });
      }

      // Use the same pricing logic as /api/price
      const pricing = calculatePizzaPrice({
        sizeId,
        baseId,
        sauceId,
        cheeseId,
        toppings: toppingIds,
        quantity: qtyNum,
      });

      // Defensive check in case calculatePizzaPrice misbehaves
      if (
        !pricing ||
        typeof pricing.total !== 'number' ||
        typeof pricing.quantity !== 'number' ||
        pricing.total <= 0 ||
        pricing.quantity <= 0
      ) {
        return res
          .status(400)
          .json({ error: 'Invalid pricing result for custom pizza' });
      }

      const unitPrice = pricing.total / pricing.quantity;

      const cart = getCartFromSession(req);

      const meta = buildCustomPizzaMeta({
        sizeId,
        baseId,
        sauceId,
        cheeseId,
        toppingIds,
      });

      const newItem = {
        id: Date.now().toString(), // simple unique ID for now
        name: 'Custom Pizza',
        meta,
        price: unitPrice,
        qty: pricing.quantity,
      };

      // Attempt to merge with existing identical custom item
      const existing = cart.find(
        (item) => item.name === newItem.name && item.meta === newItem.meta
      );

      if (existing) {
        existing.qty += newItem.qty;
      } else {
        cart.push(newItem);
      }

      const { subtotal, total } = computeTotals(cart);

      return res.status(201).json({
        message: 'Custom pizza added to cart',
        cart,
        item: newItem,
        subtotal,
        total,
      });
    } catch (err) {
      console.error('Custom cart item error:', err?.message || err, req.body);

      const isConfigError =
        err?.message && err.message.toLowerCase().includes('invalid pizza configuration');

      return res.status(isConfigError ? 400 : 500).json({
        error: isConfigError
          ? err.message
          : 'Failed to add custom pizza to cart',
      });
    }
  }

  // Branch 2: Standard item (existing behavior)
  const { name, meta, price, qty } = req.body;

  const priceNum = Number(price);
  const qtyNum = Number(qty || 1);

  if (!name || !Number.isFinite(priceNum) || priceNum <= 0) {
    return res.status(400).json({ error: 'Invalid cart item payload' });
  }

  if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
    return res.status(400).json({ error: 'Invalid quantity value' });
  }

  const cart = getCartFromSession(req);

  const newItem = {
    id: Date.now().toString(), // simple unique ID for now
    name,
    meta: meta || '',
    price: priceNum,
    qty: qtyNum,
  };

  const existing = cart.find(
    (item) => item.name === newItem.name && item.meta === newItem.meta
  );

  if (existing) {
    existing.qty += newItem.qty;
  } else {
    cart.push(newItem);
  }

  const { subtotal, total } = computeTotals(cart);

  return res.status(201).json({
    message: 'Item added to cart',
    cart,
    item: newItem,
    subtotal,
    total,
  });
});

// PATCH /api/cart/items/:id – update quantity (or remove if 0)
router.patch('/cart/items/:id', (req, res) => {
  const { id } = req.params;
  const { delta, qty } = req.body;

  const cart = getCartFromSession(req);
  const index = cart.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  if (typeof delta !== 'number' && typeof qty !== 'number') {
    return res.status(400).json({ error: 'No update value provided' });
  }

  let newQty;
  if (typeof delta === 'number') {
    newQty = cart[index].qty + delta;
  } else {
    newQty = Number(qty);
  }

  if (Number.isNaN(newQty)) {
    return res.status(400).json({ error: 'Invalid quantity value' });
  }

  if (newQty <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].qty = newQty;
  }

  const { subtotal, total } = computeTotals(cart);

  return res.json({
    message: 'Cart item updated',
    cart,
    subtotal,
    total,
  });
});

// DELETE /api/cart/items/:id – remove an item entirely
router.delete('/cart/items/:id', (req, res) => {
  const { id } = req.params;
  const cart = getCartFromSession(req);

  const index = cart.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Cart item not found' });
  }

  cart.splice(index, 1);

  const { subtotal, total } = computeTotals(cart);

  return res.json({
    message: 'Cart item removed',
    cart,
    subtotal,
    total,
  });
});

// GET /api/cart – return full cart
router.get('/cart', (req, res) => {
  const cart = getCartFromSession(req);
  const { subtotal, total } = computeTotals(cart);

  return res.json({
    items: cart,
    subtotal,
    total,
  });
});

module.exports = router;
