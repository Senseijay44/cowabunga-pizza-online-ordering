// utils/cartSession.js

/**
 * Ensure a session cart array exists and return it.
 * Falls back to an empty array when no session is present.
 * @param {import('express').Request} req
 * @returns {Array}
 */
function getCartFromSession(req) {
  if (!req.session) {
    return [];
  }

  if (!Array.isArray(req.session.cart)) {
    req.session.cart = [];
  }

  return req.session.cart;
}

module.exports = { getCartFromSession };
