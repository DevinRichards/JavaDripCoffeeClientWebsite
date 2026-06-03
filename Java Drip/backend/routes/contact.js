const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { getDb } = require('../db/database');
const { createRateLimiter } = require('../middleware/security');
const { cleanText, isValidEmail } = require('../services/validation');

const DEFAULT_CONTACT_EMAIL = 'javadripcoffee@gmail.com';

const contactLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 6,
  message: 'Too many contact submissions were sent from this connection. Please wait a bit before trying again.',
});

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) return null;

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: Number(EMAIL_PORT) === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    }
  });

  return transporter;
}

// POST /api/contact — submit a contact message
router.post('/', contactLimiter, (req, res) => {
  try {
    const name = cleanText(req.body.name);
    const email = cleanText(req.body.email).toLowerCase();
    const subject = cleanText(req.body.subject) || 'General Inquiry';
    const message = cleanText(req.body.message);

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, message'
      });
    }

    if (name.length > 120) {
      return res.status(400).json({ success: false, message: 'Name must be 120 characters or fewer.' });
    }

    if (!isValidEmail(email) || email.length > 160) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (subject.length > 120) {
      return res.status(400).json({ success: false, message: 'Subject must be 120 characters or fewer.' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message must be 2000 characters or fewer.' });
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO contact_submissions (name, email, subject, message)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(name, email, subject, message);

    const mailer = getTransporter();
    const contactRecipient = process.env.EMAIL_TO || DEFAULT_CONTACT_EMAIL;

    if (mailer && contactRecipient) {
      mailer.sendMail({
        from: process.env.EMAIL_USER,
        to: contactRecipient,
        replyTo: email,
        subject: `[Java Drip Contact] ${subject || 'General Inquiry'}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          `Subject: ${subject}`,
          '',
          message
        ].join('\n')
      }).catch((mailErr) => {
        console.error('Contact email delivery failed:', mailErr.message);
      });
    }

    console.log(`📬 Contact form submission from ${name} (${email}) — Subject: ${subject}`);

    res.status(201).json({
      success: true,
      message: 'Message received. We will get back to you shortly.',
      data: { id: result.lastInsertRowid }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit message' });
  }
});

module.exports = router;
