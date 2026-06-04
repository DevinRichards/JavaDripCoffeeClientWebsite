const nodemailer = require('nodemailer');

const DEFAULT_BUSINESS_EMAIL = 'javadripcoffee@gmail.com';

let transporter;

function isEmailConfigured() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  return Boolean(EMAIL_HOST && EMAIL_PORT && EMAIL_USER && EMAIL_PASS);
}

function getTransporter() {
  if (transporter) return transporter;

  if (!isEmailConfigured()) {
    return null;
  }

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  return transporter;
}

function getNotificationRecipients() {
  return process.env.ORDER_NOTIFICATION_EMAIL || process.env.EMAIL_TO || DEFAULT_BUSINESS_EMAIL;
}

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function renderItemsText(items = []) {
  return items.map((item) => {
    const addons = (item.addons || [])
      .map((addon) => `${addon.name} (${formatMoney(addon.price)})`)
      .join(', ');

    return [
      `${item.quantity} x ${item.item_name || item.name} @ ${formatMoney(item.item_price || item.price)}`,
      addons ? `  Add-ons: ${addons}` : null,
    ].filter(Boolean).join('\n');
  }).join('\n');
}

async function sendPickupOrderReceivedEmail(order) {
  const mailer = getTransporter();
  const to = getNotificationRecipients();
  if (!mailer || !to) return false;

  await mailer.sendMail({
    from: process.env.EMAIL_USER,
    to,
    replyTo: order.customer_email,
    subject: `[Pickup Request] ${order.customer_name} — ${order.id}`,
    text: [
      `A new pickup request is waiting for review.`,
      '',
      `Order ID: ${order.id}`,
      `Customer: ${order.customer_name}`,
      `Email: ${order.customer_email}`,
      `Phone: ${order.customer_phone || 'Not provided'}`,
      `Location ID: ${order.location_id || 'Not provided'}`,
      `Requested pickup: ${order.pickup_time || 'Not specified'}`,
      `Notes: ${order.notes || 'None'}`,
      '',
      'Items:',
      renderItemsText(order.items),
      '',
      `Subtotal: ${formatMoney(order.subtotal)}`,
      `Estimated tax: ${formatMoney(order.tax)}`,
      `Estimated fees: ${formatMoney(order.fees)}`,
      `Estimated total: ${formatMoney(order.total)}`,
      `Payment: ${order.payment_status === 'paid' ? 'Paid online through Square' : 'Square online payment pending'}`,
    ].join('\n'),
  });

  return true;
}

async function sendPickupOrderConfirmedEmail(order) {
  const mailer = getTransporter();
  if (!mailer || !order.customer_email) return false;

  await mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: order.customer_email,
    replyTo: getNotificationRecipients(),
    subject: `Your Java Drip Coffee pickup order is confirmed — ${order.id}`,
    text: [
      `Hi ${order.customer_name},`,
      '',
      `Your pickup order has been confirmed by Java Drip Coffee.`,
      `Order ID: ${order.id}`,
      `Pickup time: ${order.confirmation_pickup_time || order.pickup_time || 'We will contact you shortly'}`,
      `Payment: ${order.payment_status === 'paid' ? 'Paid online through Square' : 'Online payment pending'}`,
      '',
      'Items:',
      renderItemsText(order.items),
      '',
      `Estimated total: ${formatMoney(order.total)}`,
      '',
      order.admin_notes ? `Store note: ${order.admin_notes}` : null,
      'Please bring your order number when you arrive.',
    ].filter(Boolean).join('\n'),
  });

  return true;
}

async function sendPickupOrderCanceledEmail(order) {
  const mailer = getTransporter();
  if (!mailer || !order.customer_email) return false;

  await mailer.sendMail({
    from: process.env.EMAIL_USER,
    to: order.customer_email,
    replyTo: getNotificationRecipients(),
    subject: `Your Java Drip Coffee pickup order was cancelled — ${order.id}`,
    text: [
      `Hi ${order.customer_name},`,
      '',
      `Java Drip Coffee has cancelled this pickup request.`,
      `Order ID: ${order.id}`,
      '',
      order.admin_notes ? `Store note: ${order.admin_notes}` : null,
      'If you have questions, please contact the store directly.',
    ].filter(Boolean).join('\n'),
  });

  return true;
}

module.exports = {
  getTransporter,
  isEmailConfigured,
  sendPickupOrderReceivedEmail,
  sendPickupOrderConfirmedEmail,
  sendPickupOrderCanceledEmail,
};
