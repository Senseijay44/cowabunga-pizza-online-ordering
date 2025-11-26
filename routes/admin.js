// routes/admin.js
const express = require('express');
const router = express.Router();

const { getAllOrders, STATUS } = require('../utils/orderStore');

// In a later task, we'll add real auth middleware like requireAdmin
// For now, this is open so devs can see it.
router.get('/orders', (req, res) => {
  const orders = getAllOrders();

  res.render('admin-orders', {
    title: 'Admin · Orders',
    orders,
    STATUS,
  });
});

module.exports = router;
