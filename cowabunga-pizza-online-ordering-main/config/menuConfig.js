// config/menuConfig.js

/**
 * Core menu configuration for Cowabunga Pizza.
 * This is the single source of truth for:
 * - available bases/sizes
 * - sauces, cheeses, toppings
 * - pricing
 * - asset paths for the visual builder
 */

const SIZES = [
  {
    id: 'small',
    name: 'Small (10")',
    priceModifier: 0.9, // multiplier on base price
    isAvailable: true,
  },
  {
    id: 'medium',
    name: 'Medium (12")',
    priceModifier: 1.0,
    isAvailable: true,
  },
  {
    id: 'large',
    name: 'Large (14")',
    priceModifier: 1.3,
    isAvailable: true,
  },
];

const BASES = [
  {
    id: 'classic-dough',
    name: 'Classic Hand-Tossed',
    basePrice: 8.0,
    asset: '/assets/base/crust.png', // 🔁 update filename to your actual one
    layer: 10,
    isAvailable: true,
  },
  // If you add more doughs later, put them here.
];

const SAUCES = [
  {
    id: 'marinara',
    name: 'Marinara',
    price: 0, // included
    asset: '/assets/sauce/marinara.png',
    layer: 20,
    isAvailable: true,
  },
  {
    id: 'alfredo',
    name: 'Alfredo',
    price: 0.75,
    asset: '/assets/sauce/alfredo.png',
    layer: 20,
    isAvailable: true,
  },
  {
    id: 'barbecue',
    idAlt: 'bbq', // optional alt id if you need it
    name: 'Barbecue',
    price: 0.75,
    asset: '/assets/sauce/barbecue.png',
    layer: 20,
    isAvailable: true,
  },
];

const CHEESES = [
  {
    id: 'mozzarella',
    name: 'Mozzarella',
    price: 0, // included
    asset: '/assets/cheese/cheese.png',
    layer: 30,
    isAvailable: true,
  },
  // Add more cheeses later if needed
];

const TOPPINGS = [
  {
    id: 'pepperoni',
    name: 'Pepperoni',
    price: 1.25,
    asset: '/assets/toppings/pepperoni.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'italian_sausage',
    name: 'Italian Sausage',
    price: 1.25,
    asset: '/assets/toppings/italian_sausage.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'ham',
    name: 'Ham',
    price: 1.25,
    asset: '/assets/toppings/ham.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'salami',
    name: 'Salami',
    price: 1.50,
    asset: '/assets/toppings/salami.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'bacon',
    name: 'Bacon',
    price: 1.50,
    asset: '/assets/toppings/bacon.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'chicken',
    name: 'Chicken',
    price: 1.50,
    asset: '/assets/toppings/chicken.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'beef',
    name: 'Beef',
    price: 1.25,
    asset: '/assets/toppings/beef.png',
    layer: 40,
    isAvailable: true,
  },

  // Veggies + Specialty
  {
    id: 'mushrooms',
    name: 'Mushrooms',
    price: 1.00,
    asset: '/assets/toppings/mushrooms.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'onions',
    name: 'Onions',
    price: 0.75,
    asset: '/assets/toppings/onions.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'red_onions',
    name: 'Red Onions',
    price: 0.75,
    asset: '/assets/toppings/red_onions.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'green_peppers',
    name: 'Green Peppers',
    price: 1.00,
    asset: '/assets/toppings/green_peppers.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'banana_peppers',
    name: 'Banana Peppers',
    price: 1.00,
    asset: '/assets/toppings/banana_peppers.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'jalapeno',
    name: 'Jalapeño',
    price: 1.00,
    asset: '/assets/toppings/jalapeno.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'spinach',
    name: 'Spinach',
    price: 1.00,
    asset: '/assets/toppings/spinach.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'tomatoes',
    name: 'Tomatoes',
    price: 1.00,
    asset: '/assets/toppings/tomatoes.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'black_olives',
    name: 'Black Olives',
    price: 0.75,
    asset: '/assets/toppings/black_olives.png',
    layer: 40,
    isAvailable: true,
  },
  {
    id: 'pineapple',
    name: 'Pineapple',
    price: 1.00,
    asset: '/assets/toppings/pineapple.png',
    layer: 40,
    isAvailable: true,
  },
];

/**
 * Some simple rules so the builder and API agree.
 * This is a nice place to centralize “business logic” constraints.
 */
const BUILDER_RULES = {
  maxToppings: 10,
  defaultSizeId: 'medium',
  defaultBaseId: 'classic-dough',
  defaultSauceId: 'marinara',
  defaultCheeseId: 'mozzarella',
};

module.exports = {
  SIZES,
  BASES,
  SAUCES,
  CHEESES,
  TOPPINGS,
  BUILDER_RULES,
};
