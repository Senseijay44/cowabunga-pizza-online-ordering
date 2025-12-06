// tests/api-checkout.test.js
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../app');

const ordersPath = path.join(__dirname, '..', 'data', 'orders.json');

describe('API: Checkout and Orders', () => {
  afterAll(() => {
    fs.rmSync(ordersPath, { force: true });
  });

  test('POST /api/checkout requires address for delivery orders', async () => {
    const res = await request(app).post('/api/checkout').send({
      customer: { name: 'April O.', phone: '123-456-7890' },
      cart: [{ name: 'Veggie', price: 10, qty: 1 }],
      fulfillmentMethod: 'delivery',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Address is required for delivery');
  });

  test('successful checkout returns order id and persists retrievable order', async () => {
    const checkoutRes = await request(app).post('/api/checkout').send({
      customer: { name: 'Casey J.', phone: '555-0000', address: '123 Pizza St' },
      cart: [{ name: 'Cheese', price: 8.5, qty: 2 }],
      fulfillmentMethod: 'delivery',
    });

    expect(checkoutRes.statusCode).toBe(201);
    expect(typeof checkoutRes.body.orderId).toBe('number');

    const orderId = checkoutRes.body.orderId;
    const orderRes = await request(app).get(`/api/orders/${orderId}`);

    expect(orderRes.statusCode).toBe(200);
    expect(orderRes.body).toMatchObject({ orderId, status: 'Pending' });
  });
});
