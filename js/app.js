/* ── Supabase ── */
const SUPABASE_URL  = 'https://dwruxmnnewxawikvdhly.supabase.co';

const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cnV4bW5uZXd4YXdpa3ZkaGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MDIyNTIsImV4cCI6MjA5NzQ3ODI1Mn0.XjnHarJnANNOeNVIOajM6DNoh1DLzKzWmuHIOtcTWAA'; // substitui pelo anon public key
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── Estado global ── */
let currentUser  = null;
let viewMonth    = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
let incomeProfile = null; // cache do perfil para preview de repartição

/* ── Render helper ── */
function render(html) {
  document.getElementById('app').innerHTML = html;
}

/* ── Logout ── */
async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  navigate('login');
}

/* ── Router ── */
function navigate(page) {
  switch (page) {
    case 'login':         renderLogin();        break;
    case 'register':      renderRegister();     break;
    case 'profile-setup': renderProfileSetup(); break;
    case 'dashboard':     renderDashboard();    break;
    case 'income':        renderIncome();       break;
    default:              renderLogin();
  }
}

/* ── App shell (topbar + nav) ── */
function appShell(content, activePage = '') {
  const meta     = currentUser?.user_metadata || {};
  const fullName = meta.name || currentUser?.email || '';
  const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const first    = fullName.split(' ')[0];

  const navItems = [
    { page: 'dashboard', label: 'Dashboard' },
    { page: 'income',    label: 'Rendimentos' },
  ];
  const navHtml = navItems.map(n =>
    `<button class="nav-item${activePage === n.page ? ' active' : ''}" onclick="navigate('${n.page}')">${n.label}</button>`
  ).join('');

  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-brand">My<span>Sas</span></div>
        <nav class="topbar-nav">${navHtml}</nav>
        <div class="topbar-right">
          <div class="user-chip">
            <div class="avatar">${initials}</div>
            ${first}
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
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn      = document.getElementById('login-btn');
  const alertEl  = document.getElementById('alert');
  alertEl.className = 'alert alert-error';

  if (!email || !password) {
    alertEl.textContent = 'Preenche o email e a password.';
    alertEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'A entrar…';

  const { data, error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    alertEl.textContent = traduzirErro(error.message);
    alertEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Entrar';
    return;
  }

  currentUser = data.user;
  await checkProfileAndNavigate();
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
          <input id="password" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password" />
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
  const name     = document.getElementById('name').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const currency = document.getElementById('currency').value;
  const btn      = document.getElementById('reg-btn');
  const alertEl  = document.getElementById('alert');
  alertEl.className = 'alert alert-error';

  if (!name || !email || !password) {
    alertEl.textContent = 'Preenche todos os campos.';
    alertEl.classList.add('show');
    return;
  }
  if (password.length < 6) {
    alertEl.textContent = 'A password deve ter no mínimo 6 caracteres.';
    alertEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'A criar conta…';

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name, currency } }
  });

  if (error) {
    alertEl.textContent = traduzirErro(error.message);
    alertEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Criar conta';
    return;
  }

  currentUser = data.user;
  navigate('profile-setup');
}

/* ══════════════════════════════════════
   PÁGINA: PERFIL FINANCEIRO
══════════════════════════════════════ */
async function renderProfileSetup() {
  const { data: profile } = await sb.from('financial_profiles')
    .select('*').eq('user_id', currentUser.id).maybeSingle();

  const salary    = profile?.monthly_salary || '';
  const needs     = profile?.split_needs     ?? 50;
  const savings   = profile?.split_savings   ?? 25;
  const emergency = profile?.split_emergency ?? 15;
  const wants     = profile?.split_wants     ?? 10;
  const sym       = currencySymbol();

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
  const n = Number(document.getElementById('needs').value)     || 0;
  const s = Number(document.getElementById('savings').value)   || 0;
  const e = Number(document.getElementById('emergency').value) || 0;
  const w = Number(document.getElementById('wants').value)     || 0;
  const total = n + s + e + w;

  document.getElementById('lbl-needs').textContent     = n + '%';
  document.getElementById('lbl-savings').textContent   = s + '%';
  document.getElementById('lbl-emergency').textContent = e + '%';
  document.getElementById('lbl-wants').textContent     = w + '%';
  document.getElementById('bar-needs').style.width     = Math.min(n, 100) + '%';
  document.getElementById('bar-savings').style.width   = Math.min(s, 100) + '%';
  document.getElementById('bar-emergency').style.width = Math.min(e, 100) + '%';
  document.getElementById('bar-wants').style.width     = Math.min(w, 100) + '%';

  const totalEl       = document.getElementById('split-total');
  totalEl.textContent = `Total: ${total}%`;
  totalEl.className   = 'split-total ' + (total === 100 ? 'ok' : 'error');
}

async function submitProfile() {
  const salary    = parseFloat(document.getElementById('salary').value);
  const needs     = Number(document.getElementById('needs').value);
  const savings   = Number(document.getElementById('savings').value);
  const emergency = Number(document.getElementById('emergency').value);
  const wants     = Number(document.getElementById('wants').value);
  const btn       = document.getElementById('profile-btn');
  const alertEl   = document.getElementById('alert');
  alertEl.className = 'alert alert-error';

  if (!salary || salary <= 0) {
    alertEl.textContent = 'Introduz um salário válido.';
    alertEl.classList.add('show');
    return;
  }
  if (needs + savings + emergency + wants !== 100) {
    alertEl.textContent = 'As percentagens devem somar exactamente 100%.';
    alertEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'A guardar…';

  const { error } = await sb.from('financial_profiles').upsert({
    user_id:         currentUser.id,
    monthly_salary:  salary,
    split_needs:     needs,
    split_savings:   savings,
    split_emergency: emergency,
    split_wants:     wants,
    updated_at:      new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) {
    alertEl.textContent = 'Erro ao guardar: ' + error.message;
    alertEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Guardar e continuar';
    return;
  }

  navigate('dashboard');
}

/* ══════════════════════════════════════
   PÁGINA: DASHBOARD
══════════════════════════════════════ */
async function renderDashboard() {
  const { data: profile } = await sb.from('financial_profiles')
    .select('*').eq('user_id', currentUser.id).maybeSingle();

  const sym      = currencySymbol();
  const salary   = Number(profile?.monthly_salary  || 0);
  const needs    = Number(profile?.split_needs     ?? 50);
  const savings  = Number(profile?.split_savings   ?? 25);
  const emerg    = Number(profile?.split_emergency ?? 15);
  const wants    = Number(profile?.split_wants     ?? 10);

  const amtNeeds  = salary * needs   / 100;
  const amtSav    = salary * savings / 100;
  const amtEmerg  = salary * emerg   / 100;
  const amtWants  = salary * wants   / 100;

  const month = new Date().toLocaleString('pt-PT', { month: 'long', year: 'numeric' });

  render(appShell(`
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">Orçamento de ${month}</div>
      </div>
      <div class="salary-badge">
        <span class="salary-label">Salário mensal</span>
        <span class="salary-value">${sym} ${fmt(salary)}</span>
      </div>
    </div>

    <div class="overview-grid">
      ${ovCard('Necessidades',            amtNeeds, needs,   sym, 'var(--info)')}
      ${ovCard('Poupança / Investimento', amtSav,   savings, sym, 'var(--success)')}
      ${ovCard('Reserva de emergência',   amtEmerg, emerg,   sym, 'var(--warning)')}
      ${ovCard('Lazer / Desejos',         amtWants, wants,   sym, 'var(--primary)')}
    </div>

    <div class="dashboard-row">
      <div class="card">
        <div class="dash-section-title">Distribuição do salário</div>
        <div class="pie-wrap">
          <canvas id="pie-chart"></canvas>
          <div class="pie-legend">
            ${pieLegendItem('Necessidades', needs,   'var(--info)')}
            ${pieLegendItem('Poupança',     savings, 'var(--success)')}
            ${pieLegendItem('Emergência',   emerg,   'var(--warning)')}
            ${pieLegendItem('Lazer',        wants,   'var(--primary)')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="dash-section-title">Progresso mensal</div>
        <div class="progress-list">
          ${progressItem('Necessidades',            0, amtNeeds, sym, 'var(--info)')}
          ${progressItem('Poupança / Investimento', 0, amtSav,   sym, 'var(--success)')}
          ${progressItem('Reserva de emergência',   0, amtEmerg, sym, 'var(--warning)')}
          ${progressItem('Lazer / Desejos',         0, amtWants, sym, 'var(--primary)')}
        </div>
        <p class="progress-hint">As transações serão adicionadas na próxima fase.</p>
      </div>
    </div>
  `, 'dashboard'));

  drawDonutChart([needs, savings, emerg, wants]);
}

/* ══════════════════════════════════════
   HELPERS — cards e gráficos
══════════════════════════════════════ */
function ovCard(label, amount, pct, sym, color) {
  return `
    <div class="ov-card">
      <div class="ov-accent" style="background:${color}"></div>
      <div class="ov-body">
        <div class="ov-label">${label}</div>
        <div class="ov-amount">${sym} ${fmt(amount)}</div>
        <div class="ov-pct">${pct}% do salário</div>
      </div>
    </div>`;
}

function pieLegendItem(label, pct, color) {
  return `
    <div class="pie-legend-item">
      <span class="legend-dot" style="background:${color}"></span>
      <span class="legend-label">${label}</span>
      <span class="legend-pct">${pct}%</span>
    </div>`;
}

function progressItem(label, spent, budget, sym, color) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  return `
    <div class="prog-item">
      <div class="prog-header">
        <span class="prog-label">${label}</span>
        <span class="prog-values">${sym} ${fmt(spent)} <span class="prog-sep">/</span> ${sym} ${fmt(budget)}</span>
      </div>
      <div class="prog-track">
        <div class="prog-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
}

function drawDonutChart(data) {
  const canvas = document.getElementById('pie-chart');
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const size = 180;
  canvas.width  = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  const ctx    = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#7c6aff'];
  const cx = size / 2, cy = size / 2;
  const r  = size / 2 - 6;
  const ri = r * 0.58;
  const total = data.reduce((a, b) => a + b, 0);
  let angle = -Math.PI / 2;
  data.forEach((val, i) => {
    const slice = (val / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();
    angle += slice;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, ri, 0, 2 * Math.PI);
  ctx.fillStyle = '#161820';
  ctx.fill();
  ctx.fillStyle = '#e2e4f0';
  ctx.font = `700 ${Math.round(size * 0.085)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('100%', cx, cy);
}

/* ══════════════════════════════════════
   HELPERS — utilitários
══════════════════════════════════════ */
function fmt(n) {
  return Number(n).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currencySymbol() {
  const map = { EUR: '€', USD: '$', GBP: '£', BRL: 'R$' };
  return map[currentUser?.user_metadata?.currency] || '€';
}

function traduzirErro(msg) {
  if (msg.includes('Invalid login credentials')) return 'Email ou password incorretos.';
  if (msg.includes('Email not confirmed'))       return 'Confirma o teu email antes de entrar.';
  if (msg.includes('User already registered'))   return 'Este email já está registado.';
  if (msg.includes('Password should be'))        return 'A password deve ter no mínimo 6 caracteres.';
  return 'Erro: ' + msg;
}

async function checkProfileAndNavigate() {
  const { data } = await sb.from('financial_profiles')
    .select('monthly_salary').eq('user_id', currentUser.id).maybeSingle();
  if (!data || !data.monthly_salary || Number(data.monthly_salary) <= 0) {
    navigate('profile-setup');
  } else {
    navigate('dashboard');
  }
}

/* ══════════════════════════════════════
   PÁGINA: RENDIMENTOS
══════════════════════════════════════ */
async function renderIncome() {
  const sym = currencySymbol();
  const [rows, profileRes] = await Promise.all([
    loadIncomeRows(),
    sb.from('financial_profiles').select('*').eq('user_id', currentUser.id).maybeSingle()
  ]);
  incomeProfile = profileRes.data;

  const needs   = Number(incomeProfile?.split_needs     ?? 50);
  const savings = Number(incomeProfile?.split_savings   ?? 25);
  const emerg   = Number(incomeProfile?.split_emergency ?? 15);
  const wants   = Number(incomeProfile?.split_wants     ?? 10);

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const [year, mon] = viewMonth.split('-').map(Number);
  const label = new Date(year, mon - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' });

  render(appShell(`
    <div class="page-header">
      <div>
        <div class="page-title">Rendimentos</div>
        <div class="page-subtitle">Regista as tuas entradas de dinheiro</div>
      </div>
    </div>

    <div class="month-nav">
      <button class="btn-month" onclick="changeMonth(-1)">&#8249;</button>
      <span class="month-label">${label}</span>
      <button class="btn-month" onclick="changeMonth(1)">&#8250;</button>
      <span class="month-total">${sym} ${fmt(total)}</span>
    </div>

    <div class="card income-form-card">
      <div class="dash-section-title">Adicionar rendimento</div>
      <div id="income-alert" class="alert alert-error"></div>
      <div class="income-form-grid">
        <div class="form-group">
          <label>Tipo</label>
          <select id="inc-type">
            <option value="Salário">Salário</option>
            <option value="Freelance">Freelance</option>
            <option value="Arrendamento">Arrendamento</option>
            <option value="Dividendos">Dividendos</option>
            <option value="Pensão">Pensão</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
        <div class="form-group">
          <label>Valor</label>
          <div class="input-prefix">
            <span>${sym}</span>
            <input id="inc-amount" type="number" min="0.01" step="0.01" placeholder="0.00" oninput="updateIncomePreview()" />
          </div>
        </div>
        <div class="form-group">
          <label>Data</label>
          <input id="inc-date" type="date" value="${viewMonth}-01" />
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <input id="inc-desc" type="text" placeholder="Opcional" />
        </div>
      </div>

      <div class="split-preview-mini" id="inc-split-preview">
        <div class="spm-item" style="border-color:var(--info)">
          <span class="spm-label">Necessidades</span>
          <span class="spm-pct">${needs}%</span>
          <span class="spm-value" id="spm-needs">${sym} 0,00</span>
        </div>
        <div class="spm-item" style="border-color:var(--success)">
          <span class="spm-label">Poupança</span>
          <span class="spm-pct">${savings}%</span>
          <span class="spm-value" id="spm-savings">${sym} 0,00</span>
        </div>
        <div class="spm-item" style="border-color:var(--warning)">
          <span class="spm-label">Emergência</span>
          <span class="spm-pct">${emerg}%</span>
          <span class="spm-value" id="spm-emerg">${sym} 0,00</span>
        </div>
        <div class="spm-item" style="border-color:var(--primary)">
          <span class="spm-label">Lazer</span>
          <span class="spm-pct">${wants}%</span>
          <span class="spm-value" id="spm-wants">${sym} 0,00</span>
        </div>
      </div>

      <button class="btn btn-primary income-submit-btn" id="inc-btn" onclick="submitIncome()">Adicionar</button>
    </div>

    ${total > 0 ? `
    <div class="card" style="margin-top:1rem;">
      <div class="dash-section-title">Repartição de ${label}</div>
      <div class="split-summary-grid">
        ${splitSummaryItem('Necessidades', total * needs   / 100, needs,   sym, 'var(--info)')}
        ${splitSummaryItem('Poupança',     total * savings / 100, savings, sym, 'var(--success)')}
        ${splitSummaryItem('Emergência',   total * emerg   / 100, emerg,   sym, 'var(--warning)')}
        ${splitSummaryItem('Lazer',        total * wants   / 100, wants,   sym, 'var(--primary)')}
      </div>
      <p class="split-summary-note">Planeado com base nos ${sym} ${fmt(total)} de rendimentos deste mês.</p>
    </div>` : ''}

    <div class="card" style="margin-top:1rem;">
      <div class="dash-section-title">Rendimentos de ${label}</div>
      ${rows.length === 0
        ? `<p class="progress-hint">Ainda não há rendimentos neste mês.</p>`
        : rows.map(r => incomeRow(r, sym)).join('')
      }
    </div>
  `, 'income'));
}

function updateIncomePreview() {
  if (!incomeProfile) return;
  const amount  = parseFloat(document.getElementById('inc-amount')?.value) || 0;
  const sym     = currencySymbol();
  const needs   = Number(incomeProfile.split_needs     ?? 50);
  const savings = Number(incomeProfile.split_savings   ?? 25);
  const emerg   = Number(incomeProfile.split_emergency ?? 15);
  const wants   = Number(incomeProfile.split_wants     ?? 10);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = `${sym} ${fmt(val)}`; };
  set('spm-needs',   amount * needs   / 100);
  set('spm-savings', amount * savings / 100);
  set('spm-emerg',   amount * emerg   / 100);
  set('spm-wants',   amount * wants   / 100);
}

function splitSummaryItem(label, amount, pct, sym, color) {
  return `
    <div class="split-sum-item">
      <div class="split-sum-dot" style="background:${color}"></div>
      <div class="split-sum-body">
        <div class="split-sum-label">${label}</div>
        <div class="split-sum-amount">${sym} ${fmt(amount)}</div>
        <div class="split-sum-pct">${pct}%</div>
      </div>
    </div>`;
}

async function loadIncomeRows() {
  const [year, mon] = viewMonth.split('-').map(Number);
  const start = `${viewMonth}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const end   = `${viewMonth}-${String(lastDay).padStart(2, '0')}`;
  const { data } = await sb.from('income')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });
  return data || [];
}

function incomeRow(r, sym) {
  const date = new Date(r.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  return `
    <div class="income-item">
      <div class="income-item-left">
        <span class="income-type-badge">${r.type}</span>
        <span class="income-desc">${r.description || ''}</span>
      </div>
      <div class="income-item-right">
        <span class="income-amount">${sym} ${fmt(r.amount)}</span>
        <span class="income-date">${date}</span>
        <button class="btn-delete" onclick="deleteIncome('${r.id}')" title="Apagar">&#10005;</button>
      </div>
    </div>`;
}

async function submitIncome() {
  const type   = document.getElementById('inc-type').value;
  const amount = parseFloat(document.getElementById('inc-amount').value);
  const date   = document.getElementById('inc-date').value;
  const desc   = document.getElementById('inc-desc').value.trim();
  const btn    = document.getElementById('inc-btn');
  const alertEl = document.getElementById('income-alert');
  alertEl.className = 'alert alert-error';

  if (!amount || amount <= 0) {
    alertEl.textContent = 'Introduz um valor válido.';
    alertEl.classList.add('show');
    return;
  }
  if (!date) {
    alertEl.textContent = 'Selecciona uma data.';
    alertEl.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'A adicionar…';

  const { error } = await sb.from('income').insert({
    user_id:     currentUser.id,
    type,
    amount,
    date,
    description: desc || null
  });

  if (error) {
    alertEl.textContent = 'Erro: ' + error.message;
    alertEl.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Adicionar';
    return;
  }

  await renderIncome();
}

async function deleteIncome(id) {
  await sb.from('income').delete().eq('id', id).eq('user_id', currentUser.id);
  await renderIncome();
}

function changeMonth(delta) {
  const [year, mon] = viewMonth.split('-').map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  viewMonth = d.toISOString().slice(0, 7);
  renderIncome();
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return navigate('login');
  currentUser = session.user;
  await checkProfileAndNavigate();
}

init();
