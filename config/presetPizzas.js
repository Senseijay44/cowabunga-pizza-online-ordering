// config/presetPizzas.js

const PRESET_PIZZAS = [
  {
    id: 1,
    name: 'Cowabunga Classic',
    description: 'Pepperoni, mozzarella, red sauce.',
    price: 14.99,
    isAvailable: true,
    category: 'pizza',
    imageUrl: '/images/pizza-classic.png',
  },
  {
    id: 2,
    name: 'Turtle Supreme',
    description: 'Sausage, pepperoni, peppers, onions, olives.',
    price: 17.99,
    isAvailable: true,
    category: 'pizza',
    imageUrl: '/images/turtle-pizza.png',
  },
  {
    id: 3,
    name: 'Veggie Dojo',
    description: 'Mushrooms, peppers, onions, olives, spinach.',
    price: 15.99,
    isAvailable: true,
    category: 'pizza',
    imageUrl: '/images/pizza-veggie.png',
  },
];

module.exports = PRESET_PIZZAS;
