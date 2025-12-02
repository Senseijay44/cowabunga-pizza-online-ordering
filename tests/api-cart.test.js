// tests/api-cart.test.js
const request = require('supertest');
const app = require('../app');

describe('API: Cart endpoints', () => {
  test('GET /api/cart starts empty', async () => {
    const res = await request(app).get('/api/cart');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('POST /api/cart/items adds a standard item', async () => {
    const agent = request.agent(app); // keep cookies/session

    const addRes = await agent
      .post('/api/cart/items')
      .send({
        name: 'Test Pizza',
        price: 12.5,
        qty: 2,
      });

    expect(addRes.statusCode).toBe(201);
    expect(addRes.body).toHaveProperty('cart');
    expect(addRes.body.cart.length).toBeGreaterThan(0);

    const cartRes = await agent.get('/api/cart');
    expect(cartRes.statusCode).toBe(200);
    expect(cartRes.body.items.length).toBeGreaterThan(0);
  });
});
