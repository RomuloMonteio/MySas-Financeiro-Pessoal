const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(API_BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na API');
  return data;
}

function render(html) {
  document.getElementById('app').innerHTML = html;
}

render('<p style="color:#8b8fa8">MySas carregado com sucesso.</p>');
