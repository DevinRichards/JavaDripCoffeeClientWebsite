const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value) {
  return String(value || '').trim();
}

function isValidEmail(value) {
  return EMAIL_PATTERN.test(cleanText(value).toLowerCase());
}

module.exports = {
  cleanText,
  isValidEmail,
};
