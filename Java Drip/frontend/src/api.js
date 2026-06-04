const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

function withAdminAuth(token) {
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

function withCustomerAuth(token) {
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}

export const fetchMenu = () => request('/menu');
export const fetchGallery = () => request('/gallery');
export const fetchLocations = () => request('/locations');
export const fetchOrder = (id, token) => request(`/orders/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`);
export const submitOrder = (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) });
export const submitContact = (body) => request('/contact', { method: 'POST', body: JSON.stringify(body) });
export const fetchCustomerSession = (token) => request('/customer/session', { headers: withCustomerAuth(token) });
export const fetchPaymentConfig = () => request('/payments/config');
export const createSquareCheckout = (body) => request('/payments/square/checkout', {
  method: 'POST',
  body: JSON.stringify(body),
});
export const adminLogin = (body) => request('/admin/login', { method: 'POST', body: JSON.stringify(body) });
export const fetchAdminSession = (token) => request('/admin/session', { headers: withAdminAuth(token) });
export const fetchAdminAuthStatus = () => request('/admin/status');
export const fetchAdminMenu = (token) => request('/admin/menu', { headers: withAdminAuth(token) });
export const createAdminCategory = (token, body) => request('/admin/categories', {
  method: 'POST',
  headers: withAdminAuth(token),
  body: JSON.stringify(body),
});
export const updateAdminCategory = (token, categoryId, body) => request(`/admin/categories/${categoryId}`, {
  method: 'PUT',
  headers: withAdminAuth(token),
  body: JSON.stringify(body),
});
export const createAdminItem = (token, body) => request('/admin/items', {
  method: 'POST',
  headers: withAdminAuth(token),
  body: JSON.stringify(body),
});
export const updateAdminItem = (token, itemId, body) => request(`/admin/items/${itemId}`, {
  method: 'PUT',
  headers: withAdminAuth(token),
  body: JSON.stringify(body),
});
export const fetchAdminGallery = (token) => request('/admin/gallery', { headers: withAdminAuth(token) });
export const createAdminGalleryCategory = (token, body) => request('/admin/gallery/categories', {
  method: 'POST',
  headers: withAdminAuth(token),
  body: JSON.stringify(body),
});
export const deleteAdminGalleryCategory = (token, categoryId) => request(`/admin/gallery/categories/${categoryId}`, {
  method: 'DELETE',
  headers: withAdminAuth(token),
});
export const createAdminGalleryItem = (token, body) => request('/admin/gallery', {
  method: 'POST',
  headers: withAdminAuth(token),
  body: JSON.stringify(body),
});
export const updateAdminGalleryItem = (token, itemId, body) => request(`/admin/gallery/${itemId}`, {
  method: 'PUT',
  headers: withAdminAuth(token),
  body: JSON.stringify(body),
});
export const deleteAdminGalleryItem = (token, itemId) => request(`/admin/gallery/${itemId}`, {
  method: 'DELETE',
  headers: withAdminAuth(token),
});
export const fetchAdminOrders = (token) => request('/admin/orders', { headers: withAdminAuth(token) });
export const confirmAdminOrder = (token, orderId, body) => request(`/admin/orders/${orderId}/confirm`, {
  method: 'POST',
  headers: withAdminAuth(token),
  body: JSON.stringify(body),
});
export const cancelAdminOrder = (token, orderId, body) => request(`/admin/orders/${orderId}/cancel`, {
  method: 'POST',
  headers: withAdminAuth(token),
  body: JSON.stringify(body),
});
