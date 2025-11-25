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
    // config used by the builder
    sizes: menuConfig.SIZES,
    bases: menuConfig.BASES,
    sauces: menuConfig.SAUCES,
    cheeses: menuConfig.CHEESES,
    toppings: menuConfig.TOPPINGS,
    rules: menuConfig.BUILDER_RULES,

    // your existing hard-coded pizzas
    presetPizzas: menuItems,
  });
});

// NEW: POST /api/price – calculate price for a pizza config
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

// POST /api/cart/items – stub
router.post('/cart/items', (req, res) => {
  // TODO: validate body, add item to cart (session/DB)
  res
    .status(201)
    .json({ message: 'Item added to cart (stub)', body: req.body });
});

// PATCH /api/cart/items/:id – stub
router.patch('/cart/items/:id', (req, res) => {
  // TODO: update/remove cart item
  res.json({ message: `Cart item ${req.params.id} updated (stub)` });
});

// GET /api/cart – stub
router.get('/cart', (req, res) => {
  // TODO: pull cart from DB or session
  res.json({ items: [], total: 0 });
});

// POST /api/checkout – stub
router.post('/checkout', (req, res) => {
  // TODO: create order, prepare payment
  res.status(201).json({ message: 'Checkout created (stub)' });
});

// POST /api/payment – stub
router.post('/payment', (req, res) => {
  // TODO: integrate Stripe sandbox later
  res.json({ message: 'Payment processed (stub)', status: 'success' });
});

// GET /api/orders/:id – stub
router.get('/orders/:id', (req, res) => {
  // TODO: fetch order from DB
  res.json({ orderId: req.params.id, status: 'pending (stub)' });
});

module.exports = router;
