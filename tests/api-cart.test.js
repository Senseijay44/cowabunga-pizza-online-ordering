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

  test('PATCH /api/cart/items/:id with qty 0 removes the item', async () => {
    const agent = request.agent(app);

    const addRes = await agent.post('/api/cart/items').send({
      name: 'Temporary Pizza',
      price: 9.99,
      qty: 1,
    });

    const itemId = addRes.body.item.id;

    const updateRes = await agent
      .patch(`/api/cart/items/${itemId}`)
      .send({ qty: 0 });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.cart).toHaveLength(0);
    expect(updateRes.body.total).toBe(0);
  });

  test('POST /api/cart/items rejects custom pizzas with invalid quantity', async () => {
    const res = await request(app).post('/api/cart/items').send({
      type: 'custom',
      quantity: -2,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
