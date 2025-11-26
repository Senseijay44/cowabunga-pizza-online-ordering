// routes/admin.js
const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

const { getAllOrders, STATUS } = require('../utils/orderStore');
const { requireAdmin } = require('../middleware/auth');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!ADMIN_PASSWORD_HASH) {
  console.warn('WARNING: ADMIN_PASSWORD_HASH not set. Admin login will be disabled.');
}

// GET /admin/login – show login form
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/orders');
  }

  res.render('admin-login', {
    title: 'Admin Login',
    error: null,
  });
});

// POST /admin/login – handle login submit
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  const user = (username || '').trim();
  const pass = password || '';

  if (!user || !pass) {
    return res.status(400).render('admin-login', {
      title: 'Admin Login',
      error: 'Please enter both username and password.',
    });
  }

  if (user !== ADMIN_USERNAME) {
    return res.status(401).render('admin-login', {
      title: 'Admin Login',
      error: 'Invalid credentials.',
    });
  }

  if (!ADMIN_PASSWORD_HASH) {
    return res.status(500).render('admin-login', {
      title: 'Admin Login',
      error: 'Admin login is not configured on this server.',
    });
  }

  try {
    const match = await bcrypt.compare(pass, ADMIN_PASSWORD_HASH);
    if (!match) {
      return res.status(401).render('admin-login', {
        title: 'Admin Login',
        error: 'Invalid credentials.',
      });
    }

    // 🔐 Regenerate session ID on successful login
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regenerate error:', err);
        return res.status(500).render('admin-login', {
          title: 'Admin Login',
          error: 'Something went wrong. Please try again.',
        });
      }

      req.session.isAdmin = true;
      req.session.adminUser = ADMIN_USERNAME;

      return res.redirect('/admin/orders');
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).render('admin-login', {
      title: 'Admin Login',
      error: 'Something went wrong. Please try again.',
    });
  }
});


// GET /admin/logout – clear session
router.get('/logout', (req, res) => {
  req.session.isAdmin = false;
  req.session.adminUser = null;
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// GET /admin/orders – protected admin orders page
router.get('/orders', requireAdmin, (req, res) => {
  const orders = getAllOrders();

  res.render('admin-orders', {
    title: 'Admin · Orders',
    orders,
    STATUS,
  });
});

module.exports = router;
