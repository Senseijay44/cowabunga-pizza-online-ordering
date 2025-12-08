// routes/admin.js
const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();

const { getAllOrders, STATUS } = require('../utils/orderStore');
const { requireAdmin } = require('../middleware/auth');
const {
  getAllMenuConfig,
  getCategoryItems,
  upsertCategoryItem,
  deleteCategoryItem,
  VALID_CATEGORIES,
} = require('../utils/menuConfigStore');
const {
  getMenuItems,
  getMenuItemById,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  MENU_ITEM_CATEGORIES,
} = require('../utils/menuStore');

const parseForm = express.urlencoded({ extended: true });

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const isAdminConfigured = Boolean(ADMIN_PASSWORD_HASH);

if (!ADMIN_PASSWORD_HASH) {
  console.warn('WARNING: ADMIN_PASSWORD_HASH not set. Admin login will be disabled.');
}

const buildRedirect = (params = {}) => {
  const search = new URLSearchParams(params).toString();
  return `/admin/menu${search ? `?${search}` : ''}`;
};

const renderMenuPage = (req, res, extras = {}) => {
  const menuConfig = getAllMenuConfig();
  const presetPizzas = getMenuItems();

  res.render('admin-menu', {
    title: 'Admin Menu',
    message: extras.message || req.query.message || null,
    error: extras.error || req.query.error || null,
    presetPizzas,
    menuConfig,
    editing: extras.editing || null,
    menuCategories: MENU_ITEM_CATEGORIES,
  });
};

// GET /admin/login — show login form
router.get('/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/orders');
  }

  const statusCode = isAdminConfigured ? 200 : 503;

  res.status(statusCode).render('admin-login', {
    title: 'Admin Login',
    error: null,
    adminConfigured: isAdminConfigured,
    adminConfigMessage: isAdminConfigured
      ? null
      : 'Admin login is not configured on this server.',
  });
});

// POST /admin/login — handle login submit
router.post('/login', async (req, res) => {
  if (!isAdminConfigured) {
    return res.status(503).render('admin-login', {
      title: 'Admin Login',
      error: null,
      adminConfigured: false,
      adminConfigMessage: 'Admin login is not configured on this server.',
    });
  }

  const { username, password } = req.body || {};

  const user = (username || '').trim();
  const pass = password || '';

  if (!user || !pass) {
    return res.status(400).render('admin-login', {
      title: 'Admin Login',
      error: 'Please enter both username and password.',
      adminConfigured: isAdminConfigured,
      adminConfigMessage: null,
    });
  }

  if (user !== ADMIN_USERNAME) {
    return res.status(401).render('admin-login', {
      title: 'Admin Login',
      error: 'Invalid credentials.',
      adminConfigured: isAdminConfigured,
      adminConfigMessage: null,
    });
  }

  try {
    const match = await bcrypt.compare(pass, ADMIN_PASSWORD_HASH);
    if (!match) {
      return res.status(401).render('admin-login', {
        title: 'Admin Login',
        error: 'Invalid credentials.',
        adminConfigured: isAdminConfigured,
        adminConfigMessage: null,
      });
    }

    // Regenerate session ID on successful login
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regenerate error:', err);
        return res.status(500).render('admin-login', {
          title: 'Admin Login',
          error: 'Something went wrong. Please try again.',
          adminConfigured: isAdminConfigured,
          adminConfigMessage: null,
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
      adminConfigured: isAdminConfigured,
      adminConfigMessage: null,
    });
  }
});

// GET /admin/logout — clear session
router.get('/logout', (req, res) => {
  req.session.isAdmin = false;
  req.session.adminUser = null;
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

// GET /admin/orders — protected admin orders page
router.get('/orders', requireAdmin, (req, res) => {
  const orders = getAllOrders();

  res.render('admin-orders', {
    title: 'Admin Orders',
    orders,
    STATUS,
  });
});

router.get('/reports', requireAdmin, (req, res) => {
  const orders = getAllOrders();
  const summaries = orders.map((order) => {
    const itemCount =
      order.itemCount ||
      (Array.isArray(order.items)
        ? order.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
        : 0);

    return {
      id: order.id,
      total: Number(order.totals?.total || 0),
      itemCount,
      createdAt: order.createdAt,
    };
  });

  const totals = summaries.reduce(
    (acc, item) => {
      acc.revenue += item.total;
      acc.items += item.itemCount;
      return acc;
    },
    { revenue: 0, items: 0 }
  );

  res.render('admin-reports', {
    title: 'Admin Reports',
    orders: summaries,
    summary: {
      revenue: totals.revenue,
      orders: summaries.length,
      items: totals.items,
    },
  });
});

router.post('/menu/preset', requireAdmin, parseForm, (req, res) => {
  const { id, name, description = '', price, isAvailable, imageUrl = '', category } = req.body || {};

  if (!name || !price) {
    return res.redirect(
      buildRedirect({ error: 'Name and price are required to save a preset pizza.' }),
    );
  }

  const priceNum = Number(price);
  if (!Number.isFinite(priceNum) || priceNum <= 0) {
    return res.redirect(buildRedirect({ error: 'Price must be a positive number.' }));
  }

  const normalizedCategory = MENU_ITEM_CATEGORIES.includes(category) ? category : null;
  if (!normalizedCategory) {
    return res.redirect(buildRedirect({ error: 'Please choose a valid category.' }));
  }

  if (id) {
    updateMenuItem(id, {
      name: name.trim(),
      description: description.trim(),
      price: priceNum,
      category: normalizedCategory,
      imageUrl: imageUrl.trim(),
      isAvailable: isAvailable === 'on',
    });
    return res.redirect(buildRedirect({ message: 'Preset pizza updated.' }));
  }

  addMenuItem({
    name: name.trim(),
    description: description.trim(),
    price: priceNum,
    category: normalizedCategory,
    imageUrl: imageUrl.trim(),
    isAvailable: isAvailable === 'on',
  });

  return res.redirect(buildRedirect({ message: 'Preset pizza added.' }));
});

router.post('/menu/preset/:id/delete', requireAdmin, (req, res) => {
  const { id } = req.params;
  const success = deleteMenuItem(id);

  if (!success) {
    return res.redirect(buildRedirect({ error: 'Preset pizza not found.' }));
  }

  return res.redirect(buildRedirect({ message: 'Preset pizza deleted.' }));
});

router.post('/menu/:category', requireAdmin, parseForm, (req, res) => {
  const { category } = req.params;
  const normalizedCategory = (category || '').toLowerCase();
  const { id, name, price, isAvailable } = req.body || {};

  if (!VALID_CATEGORIES.includes(normalizedCategory)) {
    return res.redirect(buildRedirect({ error: 'Invalid category.' }));
  }

  try {
    upsertCategoryItem(normalizedCategory, {
      id,
      name: (name || '').trim(),
      price,
      isAvailable: isAvailable === 'on',
    });
    const label = normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1);
    return res.redirect(buildRedirect({ message: `${label} saved.` }));
  } catch (err) {
    return res.redirect(buildRedirect({ error: err.message || 'Unable to save item.' }));
  }
});

router.post('/menu/:category/:id/delete', requireAdmin, (req, res) => {
  const { category, id } = req.params;
  const normalizedCategory = (category || '').toLowerCase();

  if (!VALID_CATEGORIES.includes(normalizedCategory)) {
    return res.redirect(buildRedirect({ error: 'Invalid category.' }));
  }

  const success = deleteCategoryItem(normalizedCategory, id);
  if (!success) {
    return res.redirect(buildRedirect({ error: 'Item not found.' }));
  }

  const label = normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1);
  return res.redirect(buildRedirect({ message: `${label} deleted.` }));
});

// GET /admin/menu — manage preset menu items
router.get('/menu', requireAdmin, (req, res) => {
  const { editSection, editId } = req.query || {};

  if (editSection === 'preset' && editId) {
    const item = getMenuItemById(editId);
    if (item) {
      return renderMenuPage(req, res, { editing: { section: 'preset', item } });
    }
  }

  if (VALID_CATEGORIES.includes(editSection) && editId) {
    const item = (getCategoryItems(editSection) || []).find(
      (entry) => String(entry.id) === String(editId),
    );
    if (item) {
      return renderMenuPage(req, res, { editing: { section: editSection, item } });
    }
  }

  return renderMenuPage(req, res);
});

module.exports = router;
