// routes/web.js
const express = require('express');
const router = express.Router();

const { getOrderById, createOrder } = require('../utils/orderStore');
const { getMenuItems } = require('../utils/menuStore');

// Home page
router.get('/', (req, res) => {
  const menuItems = getMenuItems();
  res.render('index', {
    title: 'Cowabunga Pizza',
    heroTagline: 'Powered by pizza. Crafted for legends.',
    featured: menuItems.slice(0, 2),
  });
});

// Menu page
router.get('/menu', (req, res) => {
  res.render('menu', {
    title: 'Menu',
    menuItems: getMenuItems(),
  });
});

// Legacy cart route now redirects to the menu cart panel
router.get('/cart', (req, res) => {
  res.redirect('/menu#cart-panel');
});

// GET /checkout – show checkout form
router.get('/checkout', (req, res) => {
  res.render('checkout', {
    title: 'Checkout'
  });
});

// POST /checkout – handle form submit and redirect to confirmation
router.post('/checkout', (req, res) => {
  try {
    let { name, phone, address, cartJson, fulfillmentMethod } = req.body;

    // Normalize/trim
    name = (name || '').trim();
    phone = (phone || '').trim();
    address = (address || '').trim();

    if (!name || !phone || !address) {
      return res.status(400).send('Missing required fields.');
    }

    // Naive phone check: at least 7 digits
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      return res.status(400).send('Please enter a valid phone number.');
    }

    // Basic address sanity
    if (address.length < 5) {
      return res.status(400).send('Please enter a more complete address.');
    }

    let items = [];
    try {
      if (cartJson) {
        items = JSON.parse(cartJson);
      }
    } catch (err) {
      console.error('Failed to parse cartJson:', err);
    }

    const subtotal = items.reduce(
      (sum, item) => sum + (item.price * item.qty),
      0
    );
    const taxRate = 0.086; // 8.6% or whatever matches your UI
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const order = createOrder({
      customer: { name, phone, address },
      items,
      totals: { subtotal, tax, total },
      fulfillmentMethod: fulfillmentMethod === 'delivery' ? 'delivery' : 'pickup',
    });

    // Optional: clear cart from session after successful order
    if (req.session) {
      req.session.cart = [];
    }

    // Redirect to a confirmation page
    res.redirect(`/order-confirmation/${order.id}`);
  } catch (err) {
    console.error('Checkout form error:', err);
    res.status(500).send('Something went wrong with checkout.');
  }
});

// GET /order-confirmation/:id – confirmation screen
router.get('/order-confirmation/:id', (req, res) => {
  const order = getOrderById(req.params.id);

  if (!order) {
    return res.status(404).render('404', { title: 'Order Not Found' });
  }

  res.render('order-confirmation', {
    title: 'Order Confirmed',
    order,
  });
});

module.exports = router;
