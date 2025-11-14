# Cowabunga Pizza Online Ordering System

This is the beginning of our full-stack pizza ordering website for CS492.  
We built the planning docs in the previous course, and now this repo is the actual working version of the app.

Right now we have a clean MVP up and running: Express server, EJS layouts, basic routing, and a simple UI skeleton. Nothing fancy yet, but the foundation is solid and everything loads without errors. We’ll build out features a sprint at a time.

---

## 🚀 Project Setup

### Requirements
- Node.js (v18+)
- npm

### Install dependencies
npm install

### Run the server in dev mode
npm run dev

Server runs at:
http://localhost:3000

## 📁 Project Structure
cowabunga-pizza/
  server.js
  package.json
  /routes
    web.js
    api.js
  /views
    layout.ejs
    index.ejs
    menu.ejs
    cart.ejs
    checkout.ejs
    404.ejs
    500.ejs
  /public
    /css
      styles.css
    /js
      main.js
    /img

- Express + EJS handles server-side rendering
- express-ejs-layouts gives us a shared layout template
- public/ holds all static assets
- routes/ contains all page and API logic

## 🔧 Current MVP Features
- Working Express server
- EJS layout system wired correctly
- Homepage, Menu, Cart, and Checkout pages render
- Basic styling and layout framework
- API routes stubbed out and ready for real logic
- 404 and 500 handlers added
This is the stable version we’ll build on.

## 🎯 Next Steps (Sprint Goals)
- Style homepage and menu to look like a real pizza shop
- Add “Add to Cart” functionality (session-based or local array)
- Display cart items + totals
- Build a checkout form UI
- Implement basic order flow
- Add real pizza data (JSON or small DB)

## 👥 Team Workflow
We’re using GitHub for version control.
Make sure to:
1. Pull before you start
git pull
2. Create a feature branch
git checkout -b feature/your-feature-name
3. Add commits, then push:
git push origin feature/your-feature-name
4. Open a Pull Request so changes stay clean.

Even if we’re a smaller team this term, the repo history will reflect solid work.

## 📝 Notes

This project is built the same way a real dev team would do it. The goal isn’t just to finish — it's to create something that actually looks and feels professional. We'll keep improving it each week until it resembles a legit small-business ordering site.