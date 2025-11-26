// routes/api.js
const express = require('express');
const router = express.Router();

const menuConfig = require('../config/menuConfig.js');
const { calculatePizzaPrice } = require('../utils/pizzaPricing.js');
const {
  createOrder,
  getOrderById,
  updateOrderStatus,
  STATUS,
} = require('../utils/orderStore');

const ALLOWED_STATUSES = Object.values(STATUS);

// Same dummy data for now – preset pizzas
const menuItems = [
  {
    id: 1,
    name: 'Cowabunga Classic',
    description: 'Pepperoni, mozzarella, red sauce.',
    price: 14.99,
  },
  {
    id: 2,
    name: 'Turtle Supreme',
    description: 'Sausage, pepperoni, peppers, onions, olives.',
    price: 17.99,
  },
  {
    id: 3,
    name: 'Veggie Dojo',
    description: 'Mushrooms, peppers, onions, olives, spinach.',
    price: 15.99,
  },
];

// GET /api/menu – full menu config for builder + preset pizzas
router.get('/menu', (req, res) => {
  res.json({
    sizes: menuConfig.SIZES,
    bases: menuConfig.BASES,
    sauces: menuConfig.SAUCES,
    cheeses: menuConfig.CHEESES,
    toppings: menuConfig.TOPPINGS,
    rules: menuConfig.BUILDER_RULES,
    presetPizzas: menuItems,
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

/**
 * EP-004: Checkout API
 * POST /api/checkout
 * Expects JSON: { customer: { name, phone, address }, cart: [...], totals: { subtotal, tax, total } }
 */
router.post('/checkout', express.json(), (req, res) => {
  try {
    const { customer, cart, totals } = req.body;

    if (!customer || !customer.name || !customer.phone || !customer.address) {
      return res.status(400).json({ error: 'Missing customer information' });
    }

    const items = Array.isArray(cart) ? cart : [];
    const safeTotals = totals || { subtotal: 0, tax: 0, total: 0 };

    const order = createOrder({
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      items,
      totals: safeTotals,
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

// PATCH /api/orders/:id/status – update order status in the workflow
router.patch('/orders/:id/status', express.json(), (req, res) => {
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
});

// POST /api/payment – still a stub for now
router.post('/payment', (req, res) => {
  res.json({ message: 'Payment processed (stub)', status: 'success' });
});

// Helper to ensure cart + basic totals
function getCartFromSession(req) {
  if (!req.session.cart) {
    req.session.cart = [];
  }
  return req.session.cart;
}

function computeTotals(cart) {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const total = subtotal * 1.086; // approx 8.6% tax
  return { subtotal, total };
}

// POST /api/cart/items – add item to cart
router.post('/cart/items', (req, res) => {
  const { name, meta, price, qty } = req.body;

  if (!name || typeof price === 'undefined') {
    return res.status(400).json({ error: 'Invalid cart item payload' });
  }

  const cart = getCartFromSession(req);

  const newItem = {
    id: Date.now().toString(), // simple unique ID for now
    name,
    meta: meta || '',
    price: Number(price),
    qty: Number(qty) || 1,
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
