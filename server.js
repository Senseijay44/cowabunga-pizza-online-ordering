// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');

const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // this will use views/layout.ejs

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cowabunga-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
  })
);

// Routes
app.use('/', webRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Basic 404 handler
app.use((req, res, next) => {
  res.status(404);
  if (req.accepts('html')) {
    return res.render('404', { title: 'Page Not Found' });
  }
  if (req.accepts('json')) {
    return res.json({ error: 'Not found' });
  }
  res.type('txt').send('Not found');
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('500', { title: 'Server Error' });
});

app.listen(PORT, () => {
  console.log(`Cowabunga Pizza server running on http://localhost:${PORT}`);
});
