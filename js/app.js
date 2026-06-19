/* ── Estado global ── */
let currentUser = null;

/* ── API helper ── */
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch('/api' + path, {
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

/* ── Render helper ── */
function render(html) {
  document.getElementById('app').innerHTML = html;
}

/* ── Logout ── */
function logout() {
  localStorage.removeItem('token');
  currentUser = null;
  navigate('login');
}

/* ── Router ── */
function navigate(page) {
  switch (page) {
    case 'login':         renderLogin(); break;
    case 'register':      renderRegister(); break;
    case 'profile-setup': renderProfileSetup(); break;
    case 'dashboard':     renderDashboard(); break;
    default:              renderLogin();
  }
}

/* ── App shell (topbar) ── */
function appShell(content) {
  const initials = currentUser
    ? currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-brand">My<span>Sas</span></div>
        <div class="topbar-right">
          <div class="user-chip">
            <div class="avatar">${initials}</div>
            ${currentUser ? currentUser.name.split(' ')[0] : ''}
          </div>
          <button class="btn-logout" onclick="logout()">Sair</button>
        </div>
      </header>
      <main class="main-content">${content}</main>
    </div>`;
}

/* ══════════════════════════════════════
   PÁGINA: LOGIN
══════════════════════════════════════ */
function renderLogin() {
  render(`
    <div class="center-page">
      <div class="card auth-card">
        <div class="logo">
          <h1>MySas</h1>
          <p>Gestão financeira pessoal</p>
        </div>
        <div id="alert" class="alert alert-error"></div>
        <div class="form-group">
          <label>Email</label>
          <input id="email" type="email" placeholder="o.teu@email.com" autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input id="password" type="password" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <button class="btn btn-primary" id="login-btn" onclick="submitLogin()">Entrar</button>
        <div class="auth-footer">
          Ainda não tens conta? <a onclick="navigate('register')">Criar conta</a>
        </div>
      </div>
    </div>`);

  document.getElementById('password').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitLogin();
  });
}

async function submitLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const alert = document.getElementById('alert');

  alert.className = 'alert alert-error';

  if (!email || !password) {
    alert.textContent = 'Preenche o email e a password.';
    alert.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'A entrar…';

  try {
    const { token, user } = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('token', token);
    currentUser = user;
    await checkProfileAndNavigate();
  } catch (err) {
    alert.textContent = err.message;
    alert.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

/* ══════════════════════════════════════
   PÁGINA: REGISTO
══════════════════════════════════════ */
function renderRegister() {
  render(`
    <div class="center-page">
      <div class="card auth-card">
        <div class="logo">
          <h1>Criar conta</h1>
          <p>Começa a controlar as tuas finanças</p>
        </div>
        <div id="alert" class="alert alert-error"></div>
        <div class="form-group">
          <label>Nome completo</label>
          <input id="name" type="text" placeholder="O teu nome" autocomplete="name" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input id="email" type="email" placeholder="o.teu@email.com" autocomplete="email" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input id="password" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
        </div>
        <div class="form-group">
          <label>Moeda</label>
          <select id="currency">
            <option value="EUR">€ Euro (EUR)</option>
            <option value="USD">$ Dólar (USD)</option>
            <option value="GBP">£ Libra (GBP)</option>
            <option value="BRL">R$ Real (BRL)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="reg-btn" onclick="submitRegister()">Criar conta</button>
        <div class="auth-footer">
          Já tens conta? <a onclick="navigate('login')">Entrar</a>
        </div>
      </div>
    </div>`);
}

async function submitRegister() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const currency = document.getElementById('currency').value;
  const btn = document.getElementById('reg-btn');
  const alert = document.getElementById('alert');

  alert.className = 'alert alert-error';

  if (!name || !email || !password) {
    alert.textContent = 'Preenche todos os campos.';
    alert.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'A criar conta…';

  try {
    const { token, user } = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, currency })
    });
    localStorage.setItem('token', token);
    currentUser = user;
    navigate('profile-setup');
  } catch (err) {
    alert.textContent = err.message;
    alert.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Criar conta';
  }
}

/* ══════════════════════════════════════
   PÁGINA: PERFIL FINANCEIRO
══════════════════════════════════════ */
function renderProfileSetup(profile = null) {
  const salary = profile?.monthly_salary || '';
  const needs = profile?.split_needs ?? 50;
  const savings = profile?.split_savings ?? 25;
  const emergency = profile?.split_emergency ?? 15;
  const wants = profile?.split_wants ?? 10;
  const sym = currencySymbol();

  render(appShell(`
    <div class="center-page" style="min-height:unset;padding:0;">
      <div class="card profile-card">
        <h2>Perfil financeiro</h2>
        <p class="subtitle">Define o teu salário e como queres distribuí-lo.</p>
        <div id="alert" class="alert alert-error"></div>

        <div class="form-group">
          <label>Salário mensal líquido</label>
          <div class="input-prefix">
            <span>${sym}</span>
            <input id="salary" type="number" min="0" step="0.01" placeholder="0.00" value="${salary}" />
          </div>
        </div>

        <div class="split-preview">
          <div class="split-preview-title">Estratégia de repartição</div>
          <div class="split-bar">
            <div class="split-bar-label"><span>Necessidades</span><span id="lbl-needs">${needs}%</span></div>
            <div class="bar-track"><div class="bar-fill" id="bar-needs" style="width:${needs}%;background:var(--info)"></div></div>
          </div>
          <div class="split-bar">
            <div class="split-bar-label"><span>Poupança / Investimento</span><span id="lbl-savings">${savings}%</span></div>
            <div class="bar-track"><div class="bar-fill" id="bar-savings" style="width:${savings}%;background:var(--success)"></div></div>
          </div>
          <div class="split-bar">
            <div class="split-bar-label"><span>Reserva de emergência</span><span id="lbl-emergency">${emergency}%</span></div>
            <div class="bar-track"><div class="bar-fill" id="bar-emergency" style="width:${emergency}%;background:var(--warning)"></div></div>
          </div>
          <div class="split-bar">
            <div class="split-bar-label"><span>Lazer / Desejos</span><span id="lbl-wants">${wants}%</span></div>
            <div class="bar-track"><div class="bar-fill" id="bar-wants" style="width:${wants}%;background:var(--primary)"></div></div>
          </div>
          <div class="split-total ok" id="split-total">Total: 100%</div>
        </div>

        <div class="split-row">
          <div class="form-group">
            <label>Necessidades %</label>
            <input id="needs" type="number" min="0" max="100" value="${needs}" oninput="updateSplitPreview()" />
          </div>
          <div class="form-group">
            <label>Poupança %</label>
            <input id="savings" type="number" min="0" max="100" value="${savings}" oninput="updateSplitPreview()" />
          </div>
          <div class="form-group">
            <label>Emergência %</label>
            <input id="emergency" type="number" min="0" max="100" value="${emergency}" oninput="updateSplitPreview()" />
          </div>
          <div class="form-group">
            <label>Lazer %</label>
            <input id="wants" type="number" min="0" max="100" value="${wants}" oninput="updateSplitPreview()" />
          </div>
        </div>

        <button class="btn btn-primary" id="profile-btn" onclick="submitProfile()">Guardar e continuar</button>
      </div>
    </div>`));
}

function updateSplitPreview() {
  const n = Number(document.getElementById('needs').value) || 0;
  const s = Number(document.getElementById('savings').value) || 0;
  const e = Number(document.getElementById('emergency').value) || 0;
  const w = Number(document.getElementById('wants').value) || 0;
  const total = n + s + e + w;

  document.getElementById('lbl-needs').textContent = n + '%';
  document.getElementById('lbl-savings').textContent = s + '%';
  document.getElementById('lbl-emergency').textContent = e + '%';
  document.getElementById('lbl-wants').textContent = w + '%';
  document.getElementById('bar-needs').style.width = Math.min(n, 100) + '%';
  document.getElementById('bar-savings').style.width = Math.min(s, 100) + '%';
  document.getElementById('bar-emergency').style.width = Math.min(e, 100) + '%';
  document.getElementById('bar-wants').style.width = Math.min(w, 100) + '%';

  const totalEl = document.getElementById('split-total');
  totalEl.textContent = `Total: ${total}%`;
  totalEl.className = 'split-total ' + (total === 100 ? 'ok' : 'error');
}

async function submitProfile() {
  const salary = parseFloat(document.getElementById('salary').value);
  const needs = Number(document.getElementById('needs').value);
  const savings = Number(document.getElementById('savings').value);
  const emergency = Number(document.getElementById('emergency').value);
  const wants = Number(document.getElementById('wants').value);
  const btn = document.getElementById('profile-btn');
  const alert = document.getElementById('alert');

  alert.className = 'alert alert-error';

  if (!salary || salary <= 0) {
    alert.textContent = 'Introduz um salário válido.';
    alert.classList.add('show');
    return;
  }

  if (needs + savings + emergency + wants !== 100) {
    alert.textContent = 'As percentagens devem somar exactamente 100%.';
    alert.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'A guardar…';

  try {
    await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        monthly_salary: salary,
        split_needs: needs,
        split_savings: savings,
        split_emergency: emergency,
        split_wants: wants
      })
    });
    navigate('dashboard');
  } catch (err) {
    alert.textContent = err.message;
    alert.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Guardar e continuar';
  }
}

/* ══════════════════════════════════════
   PÁGINA: DASHBOARD (placeholder)
══════════════════════════════════════ */
function renderDashboard() {
  render(appShell(`
    <div class="page-title">Dashboard</div>
    <div class="page-subtitle">Visão geral das tuas finanças</div>
    <div class="coming-soon">
      Dashboard em construção — próxima fase a chegar em breve.
    </div>`));
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function currencySymbol() {
  const map = { EUR: '€', USD: '$', GBP: '£', BRL: 'R$' };
  return map[currentUser?.currency] || '€';
}

async function checkProfileAndNavigate() {
  try {
    const { profile } = await apiFetch('/profile');
    if (!profile || !profile.monthly_salary || Number(profile.monthly_salary) <= 0) {
      navigate('profile-setup');
    } else {
      navigate('dashboard');
    }
  } catch {
    navigate('profile-setup');
  }
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
async function init() {
  const token = localStorage.getItem('token');
  if (!token) return navigate('login');

  try {
    const { user } = await apiFetch('/auth/me');
    currentUser = user;
    await checkProfileAndNavigate();
  } catch {
    localStorage.removeItem('token');
    navigate('login');
  }
}

init();
