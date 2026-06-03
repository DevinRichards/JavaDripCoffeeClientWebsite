const express = require('express');
const { getDb } = require('../db/database');
const {
  createSquarePaymentLink,
  getSquareEnvironment,
  isSquareConfigured,
  verifySquareWebhookSignature,
} = require('../services/squarePayments');

const router = express.Router();

function parseOrderItems(rows) {
  return rows.map((row) => ({
    ...row,
    addons: row.addons_json ? JSON.parse(row.addons_json) : [],
  }));
}

function buildOrderPayload(db, order) {
  return {
    ...order,
    items: parseOrderItems(
      db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id)
    ),
  };
}

function getOrderForPayment(db, orderId, publicViewToken) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  if (order.public_view_token !== publicViewToken) return null;
  return buildOrderPayload(db, order);
}

router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      squareConfigured: isSquareConfigured(),
      squareEnvironment: getSquareEnvironment(),
    },
  });
});

router.post('/square/checkout', async (req, res) => {
  try {
    const orderId = String(req.body.order_id || '').trim();
    const publicViewToken = String(req.body.public_view_token || '').trim();

    if (!orderId || !publicViewToken) {
      return res.status(400).json({ success: false, message: 'Order ID and order token are required.' });
    }

    const db = getDb();
    const order = getOrderForPayment(db, orderId, publicViewToken);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found for payment.' });
    }

    if (order.status === 'canceled') {
      return res.status(400).json({ success: false, message: 'Canceled orders cannot be paid online.' });
    }

    if (order.payment_status === 'paid') {
      return res.json({
        success: true,
        data: {
          order,
          checkoutUrl: order.square_payment_url,
          alreadyPaid: true,
        },
      });
    }

    const checkout = await createSquarePaymentLink(order);

    db.prepare(`
      UPDATE orders
      SET payment_method = 'online',
          payment_provider = 'square',
          payment_status = 'pending',
          square_payment_link_id = ?,
          square_payment_url = ?,
          square_order_id = ?,
          status = CASE WHEN status = 'pending_confirmation' THEN 'pending_payment' ELSE status END
      WHERE id = ?
    `).run(checkout.paymentLinkId, checkout.paymentUrl, checkout.squareOrderId, order.id);

    const refreshedOrder = buildOrderPayload(db, db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id));

    return res.json({
      success: true,
      data: {
        order: refreshedOrder,
        checkoutUrl: checkout.paymentUrl,
      },
    });
  } catch (error) {
    console.error('Square checkout creation failed:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 503
        ? 'Online payment is not configured yet. Pickup orders cannot be submitted until Square checkout is available.'
        : 'Could not start Square checkout. Please try again.',
    });
  }
});

router.post('/square/webhook', (req, res) => {
  try {
    const signature = req.get('x-square-hmacsha256-signature');
    const rawBody = req.rawBody || JSON.stringify(req.body || {});

    if (!verifySquareWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid Square webhook signature.' });
    }

    const event = typeof req.body === 'object' ? req.body : JSON.parse(rawBody || '{}');
    const payment = event?.data?.object?.payment;

    if (!payment) {
      return res.json({ success: true, ignored: true });
    }

    const squareOrderId = payment.order_id;
    const paymentId = payment.id;
    const status = String(payment.status || '').toUpperCase();

    if (!squareOrderId || status !== 'COMPLETED') {
      return res.json({ success: true, ignored: true });
    }

    const db = getDb();
    db.prepare(`
      UPDATE orders
      SET payment_status = 'paid',
          payment_method = 'online',
          payment_provider = 'square',
          square_payment_id = ?,
          paid_at = datetime('now'),
          status = CASE WHEN status = 'pending_payment' THEN 'pending_confirmation' ELSE status END
      WHERE square_order_id = ?
    `).run(paymentId, squareOrderId);

    return res.json({ success: true });
  } catch (error) {
    console.error('Square webhook handling failed:', error.message);
    return res.status(500).json({ success: false, message: 'Square webhook failed.' });
  }
});

module.exports = router;
