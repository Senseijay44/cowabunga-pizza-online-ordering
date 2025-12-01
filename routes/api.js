// routes/api.js
const express = require('express');
const router = express.Router();

const menuConfig = require('../config/menuConfig.js');
const { calculatePizzaPrice } = require('../utils/pizzaPricing.js');
const {
  DEFAULT_TAX_RATE,
  buildCustomPizzaMeta,
  computeTotals,
  normalizeCartItems,
} = require('../utils/cartHelpers');
const {
  createOrder,
  getOrderById,
  updateOrderStatus,
  STATUS,
} = require('../utils/orderStore');
const {
  getMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../utils/menuStore');

const { requireAdminApi } = require('../middleware/auth');

const ALLOWED_STATUSES = Object.values(STATUS);

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------

const getCartFromSession = (req) => {
  if (!Array.isArray(req.session.cart)) {
    req.session.cart = [];
  }

  return req.session.cart;
};

// ------------------------------------------------------
// Menu + Pricing
// ------------------------------------------------------

// Admin: CRUD endpoints for preset menu items
router.get('/admin/menu', requireAdminApi, (req, res) => {
  res.json({ items: getMenuItems() });
});

router.post('/admin/menu', requireAdminApi, express.json(), (req, res) => {
  const { name, description = '', price } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  const created = addMenuItem({
    name: name.trim(),
    description: description.trim(),
    price: priceNum,
  });

  return res.status(201).json({ item: created });
});

router.put('/admin/menu/:id', requireAdminApi, express.json(), (req, res) => {
  const { id } = req.params;
  const { name, description = '', price } = req.body || {};

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  const updated = updateMenuItem(id, {
    name: name.trim(),
    description: description.trim(),
    price: priceNum,
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
  res.json({
    sizes: menuConfig.SIZES,
    bases: menuConfig.BASES,
    sauces: menuConfig.SAUCES,
    cheeses: menuConfig.CHEESES,
    toppings: menuConfig.TOPPINGS,
    rules: menuConfig.BUILDER_RULES,
    presetPizzas: getMenuItems(),
  });
});

// POST /api/price – calculate price for a pizza config
router.post('/price', express.json(), (req, res) => {
  try {
    const pizzaState = req.body; // { sizeId, baseId, sauceId, cheeseId, toppings[], quantity }
    const pricing = calculatePizzaPrice(pizzaState);
    res.json(pricing);
  } catch (err) {
    console.error('Price calculation error:', err);
    res.status(400).json({ error: 'Invalid pizza configuration' });
  }
});

// ------------------------------------------------------
// Checkout + Orders
// ------------------------------------------------------

/**
 * EP-004: Checkout API
 * POST /api/checkout
 * Expects JSON: { customer: { name, phone, address }, cart: [...] }
 * Totals are recomputed on the server.
 */
router.post('/checkout', express.json(), (req, res) => {
  try {
    const { customer, cart } = req.body || {};

    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Missing customer information' });
    }

    const items = normalizeCartItems(cart);

    if (items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty or invalid' });
    }

    // Recompute totals on the server
    const { subtotal, tax, total } = computeTotals(items, DEFAULT_TAX_RATE);

    const order = createOrder({
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      items,
      totals: { subtotal, tax, total },
    });

    return res.status(201).json({
      message: 'Order created',
      orderId: order.id,
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

// PATCH /api/orders/:id/status – update order status in the workflow (admin only)
router.patch(
  '/orders/:id/status',
  requireAdminApi,
  express.json(),
  (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body || {};

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    if (!status || typeof status !== 'string') {
      return res.status(400).json({ error: 'Missing status in request body' });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status value',
        allowed: ALLOWED_STATUSES,
      });
    }

    try {
      const updated = updateOrderStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: 'Order not found' });
      }

      return res.json({
        orderId: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      });
    } catch (err) {
      console.error('Order status update error:', err);
      return res.status(500).json({ error: 'Failed to update order status' });
    }
  }
);

// POST /api/payment – still a stub for now
router.post('/payment', (req, res) => {
  res.json({ message: 'Payment processed (stub)', status: 'success' });
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
      console.error('Custom cart item error:', err);
      return res
        .status(500)
        .json({ error: 'Failed to add custom pizza to cart' });
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
