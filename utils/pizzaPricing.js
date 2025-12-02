// utils/pizzaPricing.js

const { BUILDER_RULES } = require('../config/menuConfig.js');
const { getAvailableMenuConfig } = require('./menuConfigStore');
const { findMenuItemById } = require('./menuHelpers');

// --- Helpers --------------------------------------------------

const roundToCents = (value) => Math.round(value * 100) / 100;

// --- Core price calculation -----------------------------------

function calculatePizzaPrice(pizzaState = {}) {
  const {
    sizeId,
    baseId,
    sauceId,
    cheeseId,
    toppings = [],
    quantity = 1,
  } = pizzaState;

  const availableConfig = getAvailableMenuConfig();

  const pickItem = (list, id, defaultId) =>
    findMenuItemById(list, id) ||
    findMenuItemById(list, defaultId) ||
    (Array.isArray(list) ? list[0] : null);

  const size = pickItem(availableConfig.sizes, sizeId, BUILDER_RULES.defaultSizeId);
  const base = pickItem(availableConfig.bases, baseId, BUILDER_RULES.defaultBaseId);
  const sauce = pickItem(availableConfig.sauces, sauceId, BUILDER_RULES.defaultSauceId);
  const cheese = pickItem(
    availableConfig.cheeses,
    cheeseId,
    BUILDER_RULES.defaultCheeseId
  );

  if (!size || !base) {
    throw new Error('Invalid pizza configuration: missing size or base');
  }

  const basePrice = base.basePrice || 0;
  const sizeMultiplier = size.priceModifier || 1;
  const doughAndSizePrice = basePrice * sizeMultiplier;

  const saucePrice = sauce?.price || 0;
  const cheesePrice = cheese?.price || 0;

  const maxToppings = BUILDER_RULES.maxToppings || 50;
  const limitedToppings = toppings.slice(0, maxToppings);

  const toppingDetails = limitedToppings
    .map((toppingId) => findMenuItemById(availableConfig.toppings, toppingId))
    .filter(Boolean);

  const toppingsPrice = toppingDetails.reduce(
    (sum, topping) => sum + (topping.price || 0),
    0
  );

  const singlePizzaSubtotal =
    doughAndSizePrice + saucePrice + cheesePrice + toppingsPrice;

  const total = singlePizzaSubtotal * (quantity || 1);

  const roundedSingle = roundToCents(singlePizzaSubtotal);
  const roundedTotal = roundToCents(total);

  return {
    currency: 'USD',
    quantity: quantity || 1,
    singlePizzaSubtotal: roundedSingle,
    total: roundedTotal,
    breakdown: {
      base: roundToCents(doughAndSizePrice),
      sauce: roundToCents(saucePrice),
      cheese: roundToCents(cheesePrice),
      toppings: roundToCents(toppingsPrice),
    },
    details: {
      size,
      base,
      sauce,
      cheese,
      toppings: toppingDetails,
    },
  };
}

function calculateCartTotals(cartItems = []) {
  let subtotal = 0;

  const itemsWithPricing = cartItems.map((pizzaState) => {
    const pricing = calculatePizzaPrice(pizzaState);
    subtotal += pricing.total;
    return {
      ...pizzaState,
      pricing,
    };
  });

  const roundedSubtotal = roundToCents(subtotal);

  return {
    currency: 'USD',
    items: itemsWithPricing,
    subtotal: roundedSubtotal,
    tax: 0,
    deliveryFee: 0,
    grandTotal: roundedSubtotal,
  };
}

module.exports = {
  calculatePizzaPrice,
  calculateCartTotals,
};
