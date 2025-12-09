# 🍕 Cowabunga Pizza Online Ordering System

A full-stack online ordering platform built for CS492 using Node.js, Express, EJS, and SQLite.
This project was developed across two sprints following Agile/Scrum methodology and now includes:

- A complete customer ordering experience
- Dynamic pizza builder with live pricing
- Session-backed cart
- Checkout flow + order persistence
- Admin dashboard with menu management, builder config editing, order reporting, and CSV export

This is a fully working MVP demonstrating real-world full-stack design and implementation.

## 🚀 Project Setup
**Requirements**
- Node.js (v18+ recommended)
- npm
- SQLite (included with better-sqlite3—no manual DB setup required)

**Install dependencies**
npm install

**Development mode**
npm run dev

Server runs at:
http://localhost:3000

## 🔐 Environment Variables (Required for Admin Login)

Create a .env file in the project root:

ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt_hash_here>

You can generate a hash using:

node
const bcrypt = require('bcrypt');
bcrypt.hash('yourpassword', 10).then(console.log);


Admin login will not work without these values.

## 📁 Project Structure
cowabunga-pizza/
  server.js
  app.js
  db.js
  package.json
  .env (not committed)
  
  /routes
    web.js        # Customer pages
    api.js        # Cart, pricing, menu APIs
    admin.js      # Admin dashboard + CRUD

  /utils
    cartHelpers.js
    cartSession.js
    orderStore.js
    menuStore.js
    menuConfigStore.js  # Builder config (now persisted in SQLite)
    pizzaPricing.js

  /views
    layout.ejs
    menu.ejs
    checkout.ejs
    confirmation.ejs
    admin-menu.ejs
    admin-orders.ejs
    admin-reports.ejs
    ...
  
  /public
    /css
    /js
      main.js     # Cart logic & builder UI
      checkout.js
    /images       # Menu + builder images

### 🍕 Customer Features
✔ Dynamic Menu Page
- Menu items loaded from SQLite
- Images, descriptions, categories, and availability flags
- Admin updates appear instantly

✔ Custom Pizza Builder
- Sizes, crusts, sauces, cheeses, toppings
- Builder config fully editable in admin dashboard
- Live price recalculation via /api/price

✔ Session-Backed Cart
- Add preset or custom pizzas
- Modify quantities
- Delete items
- Totals and tax updated instantly

✔ Checkout Flow
- Server-side validation
- Order saved to SQLite with item JSON, totals, timestamps
- Redirect to confirmation screen

### 🛠️ Admin Features
✔ Secure Login (bcrypt + session)
- Credentials defined in .env.

✔ Menu Management (CRUD)
- Add/edit/delete preset pizzas
- Update prices, descriptions, categories, images
- Toggle availability

✔ Custom Builder Config Editor
- Edit sizes, crusts, sauces, cheeses, and toppings
- Config changes stored in SQLite
- Customer builder updates instantly

✔ Orders Dashboard
- Displays all orders with timestamps + totals
- Status field ready for extension

✔ Reports + CSV Export
- Revenue and item counts
- Downloadable CSV from /api/admin/report

## 🧱 Technical Architecture Overview
**Backend**
- Node.js + Express
- EJS templates for UI rendering
- Express sessions for cart storage
- RESTful API for cart, pricing, and admin actions

**Database**
- SQLite via better-sqlite3
- Tables:
  - menu_items
  - orders
  - builder_config (JSON persisted builder options)

**Frontend**
- Javascript-driven cart
- Dynamic builder modal
- Fetch-based API interactions
- Real-time subtotal/tax/total updates

## 🧪 Testing & Demo Notes
- Customer flow: menu → cart → checkout → confirmation
- Admin flow: login → orders → reports → menu editor → reload menu
- Builder config and menu edits persist across server restarts
- Make sure /public/images/ contains valid image files for menu items

## 👥 Team Workflow
- GitHub for version control
- Feature branches + PR reviews
- Slack + Jira for sprint management
- Two sprints completed with retrospectives

## 📝 Next Steps / Future Enhancements
- Stripe integration for real payments
- Order tracking UI
- Email/SMS confirmations
- Inventory-based item availability
- Multi-location support

## 🎉 Summary
Cowabunga Pizza is now a fully functional full-stack ordering system that demonstrates:

- Real-world web architecture
- Persistent data flows
- Dynamic configuration management
- Admin + customer experience integration
- Robust Agile development practices

This MVP is ready for live demo and extension.