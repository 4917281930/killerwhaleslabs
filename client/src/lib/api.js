const jsonHeaders = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: jsonHeaders,
    credentials: 'include',
    ...options
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.error?.message || 'Request failed');
  }

  return data.data;
}

export function getProjects() {
  return request('/api/projects');
}

export function createProject(payload) {
  return request('/api/admin/projects', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateProject(id, payload) {
  return request(`/api/admin/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function deleteProject(id) {
  return request(`/api/admin/projects/${id}`, { method: 'DELETE' });
}

export function uploadProjectLogo(imageData, projectName) {
  return request('/api/admin/uploads/logo', {
    method: 'POST',
    body: JSON.stringify({ imageData, projectName })
  });
}

export function getBitcoinPrice() {
  return request('/api/market/btc');
}

export function getEthereumPrice() {
  return request('/api/market/eth');
}

export function getDominance() {
  return request('/api/market/dominance');
}

export function getFearGreed() {
  return request('/api/market/fear-greed');
}

export function getGasOracle() {
  return request('/api/market/gas');
}

export function getTrendingCoins() {
  return request('/api/market/trending');
}

export function loginAdmin(payload) {
  return request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function logoutAdmin() {
  return request('/api/admin/logout', { method: 'POST' });
}

export function getAdminMe() {
  return request('/api/admin/me');
}
