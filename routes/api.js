// routes/api.js
const express = require('express');
const router = express.Router();

const menuConfig = require('../config/menuConfig.js');
const { calculatePizzaPrice } = require('../utils/pizzaPricing.js');

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

// POST /api/cart/items – add item to cart
router.post('/cart/items', (req, res) => {
  const { name, meta, price, qty } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Invalid cart item payload' });
  }

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const newItem = {
    id: Date.now().toString(), // simple unique ID for now
    name,
    meta: meta || '',
    price: Number(price),
    qty: Number(qty) || 1
  };

  const existing = req.session.cart.find(
    item => item.name === newItem.name && item.meta === newItem.meta
  );

  if (existing) {
    existing.qty += newItem.qty;
  } else {
    req.session.cart.push(newItem);
  }

  return res.status(201).json({
    message: 'Item added to cart',
    cart: req.session.cart,
    item: newItem
  });
});

// PATCH /api/cart/items/:id – update quantity or remove item
router.patch('/cart/items/:id', (req, res) => {
  const { id } = req.params;
  const { delta, qty } = req.body;

  if (!req.session.cart) {
    req.session.cart = [];
  }

  const cart = req.session.cart;
  const index = cart.findIndex(item => item.id === id);

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

  req.session.cart = cart;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  return res.json({
    message: 'Cart item updated',
    cart,
    subtotal,
    total: subtotal * 1.086
  });
});

// GET /api/cart – return full cart
router.get('/cart', (req, res) => {
  const cart = req.session.cart || [];

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  return res.json({
    items: cart,
    subtotal,
    total: subtotal * 1.086 // simple tax calc
  });
});

// POST /api/checkout – stub
router.post('/checkout', (req, res) => {
  res.status(201).json({ message: 'Checkout created (stub)' });
});

// POST /api/payment – stub
router.post('/payment', (req, res) => {
  res.json({ message: 'Payment processed (stub)', status: 'success' });
});

// GET /api/orders/:id – stub
router.get('/orders/:id', (req, res) => {
  res.json({ orderId: req.params.id, status: 'pending (stub)' });
});

module.exports = router;
