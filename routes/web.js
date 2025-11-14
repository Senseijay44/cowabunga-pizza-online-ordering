// routes/web.js
const express = require('express');
const router = express.Router();

// Temporary in-memory menu (replace with DB later)
const menuItems = [
  { id: 1, name: 'Cowabunga Classic', description: 'Pepperoni, mozzarella, red sauce.', price: 14.99 },
  { id: 2, name: 'Turtle Supreme', description: 'Sausage, pepperoni, peppers, onions, olives.', price: 17.99 },
  { id: 3, name: 'Veggie Dojo', description: 'Mushrooms, peppers, onions, olives, spinach.', price: 15.99 }
];

// Home page
router.get('/', (req, res) => {
  res.render('index', {
    title: 'Cowabunga Pizza',
    heroTagline: 'Powered by pizza. Crafted for legends.',
    featured: menuItems.slice(0, 2)
  });
});

// Menu page
router.get('/menu', (req, res) => {
  res.render('menu', {
    title: 'Menu',
    menuItems
  });
});

// Cart page (for now just a placeholder)
router.get('/cart', (req, res) => {
  res.render('cart', {
    title: 'Your Cart'
  });
});

// Checkout page
router.get('/checkout', (req, res) => {
  res.render('checkout', {
    title: 'Checkout'
  });
});

module.exports = router;
