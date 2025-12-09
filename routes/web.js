// routes/web.js
const express = require('express');
const router = express.Router();

const { getOrderById, createOrder } = require('../utils/orderStore');
const { buildOrderPayload, DEFAULT_TAX_RATE } = require('../utils/cartHelpers');
const { getCartFromSession } = require('../utils/cartSession');
const { getMenuItems, getAvailableMenuItems } = require('../utils/menuStore');

// Home page
router.get('/', (req, res) => {
  const menuItems = getAvailableMenuItems();
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
    menuItems: getAvailableMenuItems(),
  });
});

// Legacy cart route now redirects to the menu cart panel
router.get('/cart', (req, res) => {
  res.redirect('/menu#cart-panel');
});

// GET /checkout - show checkout form
router.get('/checkout', (req, res) => {
  const sessionCart = getCartFromSession(req);

  if (!sessionCart || sessionCart.length === 0) {
    return res.redirect('/menu?emptyCart=1');
  }

  res.render('checkout', {
    title: 'Checkout',
    errorMessage: null,
  });
});

// POST /checkout - handle form submit and redirect to payment placeholder
router.post('/checkout', (req, res) => {
  try {
    const { name, phone, address, email, fulfillmentMethod } = req.body;

    const sessionCart = getCartFromSession(req);

    if (!sessionCart || sessionCart.length === 0) {
      return res.redirect('/menu?emptyCart=1');
    }

    const { order, error } = buildOrderPayload({
      customer: { name, phone, address, email },
      cart: sessionCart,
      fulfillmentMethod,
      taxRate: DEFAULT_TAX_RATE,
    });

    if (error) {
      const isEmptyCart = error === 'Cart is empty or invalid';
      if (isEmptyCart) {
        return res.redirect('/menu?emptyCart=1');
      }
      return res.status(400).render('checkout', {
        title: 'Checkout',
        errorMessage: error,
      });
    }

    const created = createOrder(order);

    if (req.session) {
      req.session.cart = [];
    }

    res.redirect(`/payment/${created.id}`);
  } catch (err) {
    console.error('Checkout form error:', err);
    res.status(500).send('Something went wrong with checkout.');
  }
});

// GET /payment/:id - placeholder payment page to simulate a real provider
router.get('/payment/:id', (req, res) => {
  const order = getOrderById(req.params.id);

  if (!order) {
    return res.status(404).render('404', { title: 'Order Not Found' });
  }

  res.render('payment-placeholder', {
    title: 'Payment',
    order,
  });
});

// POST /payment/:id/complete - simulate payment success and move to confirmation
router.post('/payment/:id/complete', (req, res) => {
  const order = getOrderById(req.params.id);

  if (!order) {
    return res.status(404).render('404', { title: 'Order Not Found' });
  }

  res.redirect(`/order-confirmation/${order.id}`);
});

// GET /order-confirmation/:id - confirmation screen
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
