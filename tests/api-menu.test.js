// tests/api-menu.test.js
const request = require('supertest');
const app = require('../app');

describe('API: /api/menu', () => {
  test('GET /api/menu returns menu config and preset pizzas', async () => {
    const res = await request(app).get('/api/menu');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('sizes');
    expect(res.body).toHaveProperty('bases');
    expect(res.body).toHaveProperty('sauces');
    expect(res.body).toHaveProperty('cheeses');
    expect(res.body).toHaveProperty('toppings');
    expect(res.body).toHaveProperty('rules');
    expect(res.body).toHaveProperty('presetPizzas');

    // quick sanity check: arrays
    expect(Array.isArray(res.body.sizes)).toBe(true);
    expect(Array.isArray(res.body.presetPizzas)).toBe(true);
  });
});
