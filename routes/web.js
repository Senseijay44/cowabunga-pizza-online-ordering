// routes/web.js
const express = require('express');
const router = express.Router();

const { getOrderById, createOrder } = require('../utils/orderStore');
const { buildOrderPayload, DEFAULT_TAX_RATE } = require('../utils/cartHelpers');
const { getCartFromSession } = require('../utils/cartSession');
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
    const { name, phone, address, email, fulfillmentMethod } = req.body;

    const sessionCart = getCartFromSession(req);

    const { order, error } = buildOrderPayload({
      customer: { name, phone, address, email },
      cart: sessionCart,
      fulfillmentMethod,
      taxRate: DEFAULT_TAX_RATE,
    });

    if (error) {
      const isEmptyCart = error === 'Cart is empty or invalid';
      return res.status(400).render('checkout', {
        title: 'Checkout',
        errorMessage: isEmptyCart
          ? 'Your cart is empty. Please add items from the menu before checking out.'
          : error,
      });
    }

    const created = createOrder(order);

    if (req.session) {
      req.session.cart = [];
    }

    res.redirect(`/order-confirmation/${created.id}`);
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
