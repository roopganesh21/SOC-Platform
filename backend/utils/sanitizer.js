const net = require('net');

function sanitizeLogContent(content) {
  if (typeof content !== 'string') return '';

  let result = content;
  // Strip script tags and their contents
  result = result.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  // Strip simple inline event handlers (onClick=, onload=, etc.)
  result = result.replace(/on\w+="[^"]*"/gi, '');
  result = result.replace(/on\w+='[^']*'/gi, '');

  return result;
}

function escapeSpecialChars(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateIpAddress(value) {
  if (typeof value !== 'string') return false;
  return net.isIP(value.trim()) !== 0;
}

function validateUsername(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Allow typical Unix-style usernames and service accounts
  return /^[a-zA-Z0-9_.-]{1,64}$/.test(trimmed);
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const output = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      output[key] = escapeSpecialChars(value);
    } else if (value && typeof value === 'object') {
      output[key] = sanitizeObject(value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

module.exports = {
  sanitizeLogContent,
  validateIpAddress,
  validateUsername,
  escapeSpecialChars,
  sanitizeObject,
};
