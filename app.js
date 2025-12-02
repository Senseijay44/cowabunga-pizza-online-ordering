// app.js
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');

const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();

// ------------------------------------------------------
// VIEW ENGINE SETUP
// ------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // uses views/layout.ejs

// ------------------------------------------------------
// SESSION CONFIG (HARDENED VERSION)
// ------------------------------------------------------
if (!process.env.SESSION_SECRET) {
  console.warn(
    'WARNING: SESSION_SECRET is not set. Using a weak fallback. DO NOT USE THIS IN PRODUCTION.'
  );
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cowabunga-secret-dev-only',
    resave: false,

    // Only create sessions when needed
    saveUninitialized: false,

    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
      httpOnly: true,         // Prevent JS access to cookies
      sameSite: 'lax',        // Protects against CSRF basics
      secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    },

    // Reset session expiration on each request
    rolling: true,
  })
);

// ------------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------------
app.use((req, res, next) => {
  res.locals.isAdmin = Boolean(req.session && req.session.isAdmin);
  res.locals.isAdminRoute = req.path.startsWith('/admin');
  res.locals.currentPath = req.path;
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------
// ROUTES
// ------------------------------------------------------
app.use('/', webRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// ------------------------------------------------------
// 404 HANDLER
// ------------------------------------------------------
app.use((req, res, next) => {
  res.status(404);

  if (req.accepts('html')) {
    return res.render('404', { title: 'Page Not Found' });
  }

  if (req.accepts('json')) {
    return res.json({ error: 'Not found' });
  }

  return res.type('txt').send('Not found');
});

// ------------------------------------------------------
// ERROR HANDLER
// ------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('500', { title: 'Server Error' });
});

module.exports = app;
