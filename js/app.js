/* ── Supabase ── */
const SUPABASE_URL  = 'https://dwruxmnnewxawikvdhly.supabase.co';

const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cnV4bW5uZXd4YXdpa3ZkaGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MDIyNTIsImV4cCI6MjA5NzQ3ODI1Mn0.XjnHarJnANNOeNVIOajM6DNoh1DLzKzWmuHIOtcTWAA'; // substitui pelo anon public key
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── Estado global ── */
let currentUser   = null;
let viewMonth     = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
let incomeProfile = null;

let editingIncomeId       = null;
let _incomeCache          = [];
let incSortBy             = 'date-desc';
let incFilterType         = 'all';
let editingExpenseId      = null;
let _expenseCache         = [];
let expSortBy             = 'date-desc';
let expFilterCat          = 'all';
let editingEmergencyTxId  = null;
let _emergencyTxCache     = [];
let _emergencyFundCurrent = 0;

let _calendarData    = {};
let _selectedCalDay  = null;
let _alertsCount     = 0;
let reportMode       = 'monthly';
let _monthlyReportInc= [];
let _monthlyReportExp= [];
let _annualChartData = null;

/* ── Tipos de investimento ── */
const INVESTMENT_TYPES = [
  { name: 'Ações',        color: '#7c6aff', icon: '📈' },
  { name: 'ETF',          color: '#3b82f6', icon: '📊' },
  { name: 'Cripto',       color: '#f59e0b', icon: '₿'  },
  { name: 'Obrigações',   color: '#22c55e', icon: '📋' },
  { name: 'Imobiliário',  color: '#ec4899', icon: '🏢' },
  { name: 'Fundos',       color: '#06b6d4', icon: '💼' },
  { name: 'Outros',       color: '#6b7280', icon: '📦' },
];

/* ── Categorias de despesa ── */
const EXPENSE_CATS = [
  { name: 'Necessidades',    color: '#3b82f6', icon: '🏠', split: 'needs' },
  { name: 'Lazer / Desejos', color: '#ec4899', icon: '🎮', split: 'wants' },
];

/* Compatibilidade com categorias antigas + lookup visual */
function getExpenseSplit(category) {
  const cat = EXPENSE_CATS.find(c => c.name === category);
  if (cat) return cat.split;
  return ['Casa', 'Comida', 'Transporte', 'Saúde'].includes(category) ? 'needs' : 'wants';
}

function getExpenseCatMeta(category) {
  const cat = EXPENSE_CATS.find(c => c.name === category);
  if (cat) return cat;
  const isNeeds = ['Casa', 'Comida', 'Transporte', 'Saúde'].includes(category);
  return { color: isNeeds ? '#3b82f6' : '#ec4899', icon: isNeeds ? '🏠' : '🎮' };
}

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
    case 'expenses':      renderExpenses();     break;
    case 'emergency':     renderEmergencyFund();  break;
    case 'investments':   renderInvestments();    break;
    case 'more':          renderMore();           break;
    case 'calendar':      renderCalendar();       break;
    case 'reports':       renderReports();        break;
    case 'alerts':        renderAlerts();         break;
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
    { page: 'dashboard',   label: 'Dashboard' },
    { page: 'income',      label: 'Rendimentos' },
    { page: 'expenses',    label: 'Despesas' },
    { page: 'emergency',   label: 'Emergência' },
    { page: 'investments', label: 'Investimentos' },
    { page: 'calendar',    label: 'Calendário' },
    { page: 'reports',     label: 'Relatórios' },
    { page: 'alerts',      label: 'Alertas' },
  ];
  const navHtml = navItems.map(n =>
    `<button class="nav-item${activePage === n.page ? ' active' : ''}" onclick="navigate('${n.page}')">${n.label}</button>`
  ).join('');

  const bnavItems = [
    {
      page: 'dashboard',
      label: 'Início',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`
    },
    {
      page: 'income',
      label: 'Entradas',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
    },
    {
      page: 'expenses',
      label: 'Gastos',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`
    },
    {
      page: 'emergency',
      label: 'Reserva',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    },
    {
      page: 'investments',
      label: 'Carteira',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`
    },
    {
      page: 'more',
      label: 'Mais',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`
    }
  ];
  const bnavHtml = bnavItems.map(n => {
    const badge = (n.page === 'more' && _alertsCount > 0)
      ? `<span class="alert-badge">${_alertsCount}</span>`
      : '';
    return `<button class="bnav-item${activePage === n.page ? ' active' : ''}" onclick="navigate('${n.page}')" style="${n.page === 'more' ? 'position:relative' : ''}">
      ${n.icon}${badge}<span>${n.label}</span>
    </button>`;
  }).join('');

  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-brand">My<span>Sas</span></div>
        <nav class="topbar-nav">${navHtml}</nav>
        <div class="topbar-right">
          <button class="user-chip" onclick="navigate('profile-setup')" title="Perfil e configurações">
            <div class="avatar">${initials}</div>
            <span class="user-name">${first}</span>
          </button>
          <button class="btn-logout" onclick="logout()">Sair</button>
        </div>
      </header>
      <main class="main-content">${content}</main>
      <nav class="bottom-nav">${bnavHtml}</nav>
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
  const hasToken  = !!profile?.api_token;

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

      <div class="card" style="margin-top:1rem;">
        <div class="dash-section-title" style="display:flex;align-items:center;gap:0.5rem;">
          <span>Atalho iPhone (Apple Pay)</span>
        </div>
        <p style="color:var(--text2);font-size:0.875rem;margin:0.25rem 0 1rem">
          Gera um token pessoal e configura uma Automatização iOS Shortcuts com trigger <strong>Wallet</strong>. Cada vez que pagares com Apple Pay, o iPhone pergunta o valor e a categoria, e a despesa é adicionada ao MySas automaticamente.
        </p>
        <div id="api-token-alert" class="alert alert-error"></div>
        ${hasToken ? `
        <div class="api-token-status">
          <span class="api-token-ok">Token configurado</span>
          <span style="color:var(--text2);font-size:0.8rem;">Clica em "Regenerar" para criar um novo token (invalida o anterior).</span>
        </div>` : ''}
        <div id="api-token-display" style="display:none;margin-bottom:1rem;">
          <label style="font-size:0.75rem;color:var(--text2);display:block;margin-bottom:0.25rem;">O teu token de acesso — copia antes de sair desta página</label>
          <div style="display:flex;gap:0.5rem;">
            <input id="api-token-value" type="text" readonly
              style="font-family:monospace;font-size:0.7rem;background:var(--bg3);flex:1;min-width:0;" />
            <button class="btn btn-secondary" onclick="copyApiToken()" id="copy-token-btn" style="white-space:nowrap;flex-shrink:0;">Copiar</button>
          </div>
          <p style="font-size:0.75rem;color:var(--warning);margin:0.5rem 0 0;">
            Guarda este token — se saíres da página sem copiar, terás de regenerar.
          </p>
        </div>
        <button class="btn btn-secondary" id="gen-token-btn" onclick="generateApiToken()">
          ${hasToken ? 'Regenerar token' : 'Gerar token de acesso'}
        </button>
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

async function generateApiToken() {
  const btn     = document.getElementById('gen-token-btn');
  const alertEl = document.getElementById('api-token-alert');
  alertEl.className = 'alert alert-error';
  btn.disabled    = true;
  btn.textContent = 'A gerar…';

  const token = crypto.randomUUID();

  const { error } = await sb.from('financial_profiles').upsert({
    user_id:    currentUser.id,
    api_token:  token,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) {
    alertEl.textContent = 'Erro ao gerar token: ' + error.message;
    alertEl.classList.add('show');
    btn.disabled    = false;
    btn.textContent = 'Gerar token de acesso';
    return;
  }

  document.getElementById('api-token-value').value       = token;
  document.getElementById('api-token-display').style.display = 'block';
  btn.disabled    = false;
  btn.textContent = 'Regenerar token';
}

function copyApiToken() {
  const val = document.getElementById('api-token-value').value;
  navigator.clipboard.writeText(val).then(() => {
    const btn = document.getElementById('copy-token-btn');
    btn.textContent = 'Copiado!';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
  });
}

/* ══════════════════════════════════════
   PÁGINA: DASHBOARD
══════════════════════════════════════ */
async function renderDashboard() {
  const now       = new Date();
  const dashMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dashStart = `${dashMonth}-01`;
  const dashEnd   = `${dashMonth}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const month     = now.toLocaleString('pt-PT', { month: 'long', year: 'numeric' });

  const [profileRes, expRes, incRes, invMonthRes, invAllRes, emergRes, emergTxRes] = await Promise.all([
    sb.from('financial_profiles').select('*').eq('user_id', currentUser.id).maybeSingle(),
    sb.from('expenses').select('category, amount').eq('user_id', currentUser.id).gte('date', dashStart).lte('date', dashEnd),
    sb.from('income').select('amount').eq('user_id', currentUser.id).gte('date', dashStart).lte('date', dashEnd),
    sb.from('investments').select('amount').eq('user_id', currentUser.id).gte('date', dashStart).lte('date', dashEnd),
    sb.from('investments').select('current_value, amount').eq('user_id', currentUser.id),
    sb.from('emergency_fund').select('current_amount').eq('user_id', currentUser.id).maybeSingle(),
    sb.from('emergency_transactions').select('amount').eq('user_id', currentUser.id).gte('date', dashStart).lte('date', dashEnd)
  ]);

  const profile  = profileRes.data;
  const expenses = expRes.data || [];
  const sym      = currencySymbol();
  const salary   = Number(profile?.monthly_salary  || 0);
  const needs    = Number(profile?.split_needs     ?? 50);
  const savings  = Number(profile?.split_savings   ?? 25);
  const emerg    = Number(profile?.split_emergency ?? 15);
  const wants    = Number(profile?.split_wants     ?? 10);

  const amtNeeds = salary * needs   / 100;
  const amtSav   = salary * savings / 100;
  const amtEmerg = salary * emerg   / 100;
  const amtWants = salary * wants   / 100;

  // Cash flow do mês
  const incomeTotal   = (incRes.data  || []).reduce((s, r) => s + Number(r.amount), 0);
  const expTotal      = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const invMonth      = (invMonthRes.data || []).reduce((s, i) => s + Number(i.amount), 0);
  const emergDeposits = (emergTxRes.data || []).filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const emergNetFlow  = (emergTxRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
  const disponivel    = incomeTotal - expTotal - invMonth - emergNetFlow;
  const dispColor     = disponivel >= 0 ? 'var(--success)' : 'var(--danger)';
  const dispSign      = disponivel < 0 ? '-' : '';

  // Património total
  const invTotal   = (invAllRes.data || []).reduce((s, i) => s + Number(i.current_value ?? i.amount), 0);
  const emergTotal = Number(emergRes.data?.current_amount || 0);
  const patrimonio = invTotal + emergTotal + Math.max(0, disponivel);

  // Progresso por categoria
  const spentNeeds = expenses.filter(e => getExpenseSplit(e.category) === 'needs').reduce((s, e) => s + Number(e.amount), 0);
  const spentWants = expenses.filter(e => getExpenseSplit(e.category) === 'wants').reduce((s, e) => s + Number(e.amount), 0);
  const hasActivity  = incomeTotal > 0 || expTotal > 0 || invMonth > 0;

  render(appShell(`
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">${month.charAt(0).toUpperCase() + month.slice(1)}</div>
      </div>
    </div>

    <div class="hero-grid">
      <div class="hero-card" style="border-left:3px solid ${dispColor}">
        <div class="hero-label">Disponível este mês</div>
        <div class="hero-value" style="color:${dispColor}">${dispSign}${sym} ${fmt(Math.abs(disponivel))}</div>
        <div class="hero-sub">
          ${incomeTotal > 0
            ? `↑ ${sym} ${fmt(incomeTotal)} &nbsp;·&nbsp; ↓ ${sym} ${fmt(expTotal + invMonth)}`
            : 'Regista rendimentos para ver o saldo'}
        </div>
      </div>
      <div class="hero-card" style="border-left:3px solid var(--primary)">
        <div class="hero-label">Património total</div>
        <div class="hero-value">${sym} ${fmt(patrimonio)}</div>
        <div class="hero-sub">
          Invest. ${sym} ${fmt(invTotal)} &nbsp;·&nbsp; Reserva ${sym} ${fmt(emergTotal)}
        </div>
      </div>
    </div>

    <div class="overview-grid">
      ${ovCard('Necessidades',          amtNeeds, needs,   sym, 'var(--info)')}
      ${ovCard('Poupança / Invest.',    amtSav,   savings, sym, 'var(--success)')}
      ${ovCard('Reserva emergência',    amtEmerg, emerg,   sym, 'var(--warning)')}
      ${ovCard('Lazer / Desejos',       amtWants, wants,   sym, 'var(--primary)')}
    </div>

    <div class="card">
      <div class="dash-section-title">Progresso mensal</div>
      <div class="progress-list">
        ${progressItem('Necessidades',            spentNeeds, amtNeeds, sym, 'var(--info)')}
        ${progressItem('Poupança / Investimento', invMonth,   amtSav,   sym, 'var(--success)')}
        ${progressItem('Reserva de emergência',   Math.max(0, emergNetFlow), amtEmerg, sym, 'var(--warning)')}
        ${progressItem('Lazer / Desejos',         spentWants, amtWants, sym, 'var(--primary)')}
      </div>
      ${!hasActivity ? `<p class="progress-hint">Regista rendimentos, despesas e investimentos para ver o progresso.</p>` : ''}
    </div>

    <div class="card" style="margin-top:1rem;">
      <div class="dash-section-title">Distribuição do orçamento</div>
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

  const now         = new Date();
  const todayStr    = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultDate = viewMonth === todayStr.slice(0, 7) ? todayStr : `${viewMonth}-01`;

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

    <div class="card income-form-card" id="inc-form-card">
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
          <input id="inc-date" type="date" value="${defaultDate}" />
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

      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;margin-top:0.5rem;">
        <button class="btn btn-primary income-submit-btn" id="inc-btn" onclick="submitIncome()">Adicionar</button>
        <button class="btn btn-secondary" id="inc-cancel" onclick="cancelEditIncome()" style="display:none;">Cancelar edição</button>
      </div>
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
      <div class="list-header">
        <div class="dash-section-title" style="margin-bottom:0">Rendimentos de ${label}</div>
        <select class="sort-select" onchange="setIncomeSort(this.value)">
          <option value="date-desc"   ${incSortBy === 'date-desc'   ? 'selected' : ''}>↓ Data</option>
          <option value="date-asc"    ${incSortBy === 'date-asc'    ? 'selected' : ''}>↑ Data</option>
          <option value="amount-desc" ${incSortBy === 'amount-desc' ? 'selected' : ''}>↓ Valor</option>
          <option value="amount-asc"  ${incSortBy === 'amount-asc'  ? 'selected' : ''}>↑ Valor</option>
        </select>
      </div>
      ${rows.length > 0 ? `
      <div class="filter-chips">
        <button class="chip inc-chip${incFilterType === 'all' ? ' active' : ''}" data-type="all" onclick="setIncomeFilter('all')">Todos</button>
        ${['Salário','Freelance','Arrendamento','Dividendos','Pensão','Outros'].map(t =>
          `<button class="chip inc-chip${incFilterType === t ? ' active' : ''}" data-type="${t}" onclick="setIncomeFilter('${t}')">${t}</button>`
        ).join('')}
      </div>` : ''}
      <div id="inc-list-body">
        ${rows.length === 0
          ? `<p class="progress-hint">Ainda não há rendimentos neste mês.</p>`
          : applyIncomeFilters(rows, sym)
        }
      </div>
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
  _incomeCache = data || [];
  return _incomeCache;
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
        <button class="btn-edit"   onclick="editIncome('${r.id}')"   title="Editar">&#9998;</button>
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

  btn.disabled    = true;
  btn.textContent = editingIncomeId ? 'A actualizar…' : 'A adicionar…';

  let error;
  if (editingIncomeId) {
    ({ error } = await sb.from('income').update({
      type, amount, date, description: desc || null
    }).eq('id', editingIncomeId).eq('user_id', currentUser.id));
    editingIncomeId = null;
  } else {
    ({ error } = await sb.from('income').insert({
      user_id: currentUser.id, type, amount, date, description: desc || null
    }));
  }

  if (error) {
    alertEl.textContent = 'Erro: ' + error.message;
    alertEl.classList.add('show');
    btn.disabled    = false;
    btn.textContent = 'Adicionar';
    return;
  }

  await renderIncome();
}

async function deleteIncome(id) {
  await sb.from('income').delete().eq('id', id).eq('user_id', currentUser.id);
  await renderIncome();
}

function editIncome(id) {
  const r = _incomeCache.find(x => x.id === id);
  if (!r) return;
  editingIncomeId = id;
  document.getElementById('inc-type').value   = r.type;
  document.getElementById('inc-amount').value = r.amount;
  document.getElementById('inc-date').value   = r.date;
  document.getElementById('inc-desc').value   = r.description || '';
  document.getElementById('inc-btn').textContent = 'Actualizar rendimento';
  document.getElementById('inc-cancel').style.display = 'inline-block';
  document.getElementById('inc-form-card').scrollIntoView({ behavior: 'smooth' });
}

function applyIncomeFilters(data, sym) {
  let result = incFilterType === 'all' ? data : data.filter(r => r.type === incFilterType);
  result = [...result].sort((a, b) => {
    if (incSortBy === 'date-desc')   return b.date.localeCompare(a.date);
    if (incSortBy === 'date-asc')    return a.date.localeCompare(b.date);
    if (incSortBy === 'amount-desc') return Number(b.amount) - Number(a.amount);
    if (incSortBy === 'amount-asc')  return Number(a.amount) - Number(b.amount);
    return 0;
  });
  if (result.length === 0) return '<p class="progress-hint">Sem rendimentos com este filtro.</p>';
  return result.map(r => incomeRow(r, sym)).join('');
}

function setIncomeSort(val) {
  incSortBy = val;
  const el = document.getElementById('inc-list-body');
  if (el) el.innerHTML = applyIncomeFilters(_incomeCache, currencySymbol());
}

function setIncomeFilter(type) {
  incFilterType = type;
  document.querySelectorAll('.inc-chip').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  const el = document.getElementById('inc-list-body');
  if (el) el.innerHTML = applyIncomeFilters(_incomeCache, currencySymbol());
}

function cancelEditIncome() {
  editingIncomeId = null;
  document.getElementById('inc-btn').textContent          = 'Adicionar';
  document.getElementById('inc-cancel').style.display     = 'none';
  document.getElementById('inc-amount').value             = '';
  document.getElementById('inc-desc').value               = '';
  document.getElementById('income-alert').className       = 'alert alert-error';
}

function changeMonth(delta) {
  const [year, mon] = viewMonth.split('-').map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  viewMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  renderIncome();
}

/* ══════════════════════════════════════
   PÁGINA: DESPESAS
══════════════════════════════════════ */
async function renderExpenses() {
  const sym = currencySymbol();
  const now = new Date();
  const todayStr   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultDate = viewMonth === todayStr.slice(0, 7) ? todayStr : `${viewMonth}-01`;

  const [rows, profileRes] = await Promise.all([
    loadExpenseRows(),
    sb.from('financial_profiles').select('monthly_salary, split_needs, split_wants').eq('user_id', currentUser.id).maybeSingle()
  ]);

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const [year, mon] = viewMonth.split('-').map(Number);
  const label = new Date(year, mon - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' });

  const byCategory = {};
  rows.forEach(r => { byCategory[r.category] = (byCategory[r.category] || 0) + Number(r.amount); });

  render(appShell(`
    <div class="page-header">
      <div>
        <div class="page-title">Despesas</div>
        <div class="page-subtitle">Regista os teus gastos do mês</div>
      </div>
    </div>

    <div class="month-nav">
      <button class="btn-month" onclick="changeMonthExpenses(-1)">&#8249;</button>
      <span class="month-label">${label}</span>
      <button class="btn-month" onclick="changeMonthExpenses(1)">&#8250;</button>
      <span class="month-total" style="color:var(--danger)">${sym} ${fmt(total)}</span>
    </div>

    <div class="card income-form-card" id="exp-form-card">
      <div class="dash-section-title">Adicionar despesa</div>
      <div id="exp-alert" class="alert alert-error"></div>
      <div class="income-form-grid">
        <div class="form-group">
          <label>Categoria</label>
          <select id="exp-cat">
            ${EXPENSE_CATS.map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Valor</label>
          <div class="input-prefix">
            <span>${sym}</span>
            <input id="exp-amount" type="number" min="0.01" step="0.01" placeholder="0.00" />
          </div>
        </div>
        <div class="form-group">
          <label>Data</label>
          <input id="exp-date" type="date" value="${defaultDate}" />
        </div>
        <div class="form-group">
          <label>Descrição</label>
          <input id="exp-desc" type="text" placeholder="Opcional" />
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;margin-top:0.5rem;">
        <button class="btn btn-primary income-submit-btn" id="exp-btn" onclick="submitExpense()">Adicionar despesa</button>
        <button class="btn btn-secondary" id="exp-cancel" onclick="cancelEditExpense()" style="display:none;">Cancelar edição</button>
      </div>
    </div>

    ${total > 0 ? expenseCategorySummary(byCategory, total, sym) : ''}

    <div class="card" style="margin-top:1rem;">
      <div class="list-header">
        <div class="dash-section-title" style="margin-bottom:0">Despesas de ${label}</div>
        <select class="sort-select" onchange="setExpenseSort(this.value)">
          <option value="date-desc"   ${expSortBy === 'date-desc'   ? 'selected' : ''}>↓ Data</option>
          <option value="date-asc"    ${expSortBy === 'date-asc'    ? 'selected' : ''}>↑ Data</option>
          <option value="amount-desc" ${expSortBy === 'amount-desc' ? 'selected' : ''}>↓ Valor</option>
          <option value="amount-asc"  ${expSortBy === 'amount-asc'  ? 'selected' : ''}>↑ Valor</option>
        </select>
      </div>
      ${rows.length > 0 ? `
      <div class="filter-chips">
        <button class="chip exp-chip${expFilterCat === 'all' ? ' active' : ''}" data-cat="all" onclick="setExpenseFilter('all')">Todos</button>
        ${EXPENSE_CATS.map(c =>
          `<button class="chip exp-chip${expFilterCat === c.name ? ' active' : ''}" data-cat="${c.name}" onclick="setExpenseFilter('${c.name}')">${c.icon} ${c.name}</button>`
        ).join('')}
      </div>` : ''}
      <div id="exp-list-body">
        ${rows.length === 0
          ? `<p class="progress-hint">Ainda não há despesas neste mês.</p>`
          : applyExpenseFilters(rows, sym)
        }
      </div>
    </div>
  `, 'expenses'));
}

function expenseCategorySummary(byCategory, total, sym) {
  const items = EXPENSE_CATS
    .filter(c => byCategory[c.name])
    .map(c => {
      const amount = byCategory[c.name];
      const pct    = Math.round(amount / total * 100);
      return `
        <div class="prog-item">
          <div class="prog-header">
            <span class="prog-label">${c.icon} ${c.name}</span>
            <span class="prog-values">${sym} ${fmt(amount)} <span class="prog-sep">·</span> ${pct}%</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill" style="width:${pct}%;background:${c.color}"></div>
          </div>
        </div>`;
    }).join('');

  return `
    <div class="card" style="margin-top:1rem;">
      <div class="dash-section-title">Por categoria</div>
      <div class="progress-list">${items}</div>
    </div>`;
}

async function loadExpenseRows() {
  const [year, mon] = viewMonth.split('-').map(Number);
  const start   = `${viewMonth}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const end     = `${viewMonth}-${String(lastDay).padStart(2, '0')}`;
  const { data } = await sb.from('expenses')
    .select('*')
    .eq('user_id', currentUser.id)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });
  _expenseCache = data || [];
  return _expenseCache;
}

function expenseRow(r, sym) {
  const cat  = getExpenseCatMeta(r.category);
  const date = new Date(r.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  return `
    <div class="income-item">
      <div class="income-item-left">
        <span class="income-type-badge" style="background:${cat.color}22;color:${cat.color};border-color:${cat.color}44">${cat.icon} ${r.category}</span>
        <span class="income-desc">${r.description || ''}</span>
      </div>
      <div class="income-item-right">
        <span class="income-amount" style="color:var(--danger)">${sym} ${fmt(r.amount)}</span>
        <span class="income-date">${date}</span>
        <button class="btn-edit"   onclick="editExpense('${r.id}')"   title="Editar">&#9998;</button>
        <button class="btn-delete" onclick="deleteExpense('${r.id}')" title="Apagar">&#10005;</button>
      </div>
    </div>`;
}

async function submitExpense() {
  const category = document.getElementById('exp-cat').value;
  const amount   = parseFloat(document.getElementById('exp-amount').value);
  const date     = document.getElementById('exp-date').value;
  const desc     = document.getElementById('exp-desc').value.trim();
  const btn      = document.getElementById('exp-btn');
  const alertEl  = document.getElementById('exp-alert');
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

  btn.disabled    = true;
  btn.textContent = editingExpenseId ? 'A actualizar…' : 'A adicionar…';

  let error;
  if (editingExpenseId) {
    ({ error } = await sb.from('expenses').update({
      category, amount, date, description: desc || null
    }).eq('id', editingExpenseId).eq('user_id', currentUser.id));
    editingExpenseId = null;
  } else {
    ({ error } = await sb.from('expenses').insert({
      user_id: currentUser.id, category, amount, date, description: desc || null
    }));
  }

  if (error) {
    alertEl.textContent = 'Erro: ' + error.message;
    alertEl.classList.add('show');
    btn.disabled    = false;
    btn.textContent = 'Adicionar despesa';
    return;
  }

  await renderExpenses();
}

async function deleteExpense(id) {
  await sb.from('expenses').delete().eq('id', id).eq('user_id', currentUser.id);
  await renderExpenses();
}

function editExpense(id) {
  const r = _expenseCache.find(x => x.id === id);
  if (!r) return;
  editingExpenseId = id;
  document.getElementById('exp-cat').value    = r.category;
  document.getElementById('exp-amount').value = r.amount;
  document.getElementById('exp-date').value   = r.date;
  document.getElementById('exp-desc').value   = r.description || '';
  document.getElementById('exp-btn').textContent         = 'Actualizar despesa';
  document.getElementById('exp-cancel').style.display    = 'inline-block';
  document.getElementById('exp-form-card').scrollIntoView({ behavior: 'smooth' });
}

function applyExpenseFilters(data, sym) {
  let result = expFilterCat === 'all' ? data : data.filter(r => r.category === expFilterCat);
  result = [...result].sort((a, b) => {
    if (expSortBy === 'date-desc')   return b.date.localeCompare(a.date);
    if (expSortBy === 'date-asc')    return a.date.localeCompare(b.date);
    if (expSortBy === 'amount-desc') return Number(b.amount) - Number(a.amount);
    if (expSortBy === 'amount-asc')  return Number(a.amount) - Number(b.amount);
    return 0;
  });
  if (result.length === 0) return '<p class="progress-hint">Sem despesas com este filtro.</p>';
  return result.map(r => expenseRow(r, sym)).join('');
}

function setExpenseSort(val) {
  expSortBy = val;
  const el = document.getElementById('exp-list-body');
  if (el) el.innerHTML = applyExpenseFilters(_expenseCache, currencySymbol());
}

function setExpenseFilter(cat) {
  expFilterCat = cat;
  document.querySelectorAll('.exp-chip').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  const el = document.getElementById('exp-list-body');
  if (el) el.innerHTML = applyExpenseFilters(_expenseCache, currencySymbol());
}

function cancelEditExpense() {
  editingExpenseId = null;
  document.getElementById('exp-btn').textContent      = 'Adicionar despesa';
  document.getElementById('exp-cancel').style.display = 'none';
  document.getElementById('exp-amount').value         = '';
  document.getElementById('exp-desc').value           = '';
  document.getElementById('exp-alert').className      = 'alert alert-error';
}

function changeMonthExpenses(delta) {
  const [year, mon] = viewMonth.split('-').map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  viewMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  renderExpenses();
}

/* ══════════════════════════════════════
   PÁGINA: RESERVA DE EMERGÊNCIA
══════════════════════════════════════ */
async function renderEmergencyFund() {
  const sym = currencySymbol();
  const now = new Date();
  const todayStr  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const start3m   = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const start3mStr = `${start3m.getFullYear()}-${String(start3m.getMonth() + 1).padStart(2, '0')}-01`;

  const [fundRes, expRes, txRes] = await Promise.all([
    sb.from('emergency_fund').select('*').eq('user_id', currentUser.id).maybeSingle(),
    sb.from('expenses').select('amount').eq('user_id', currentUser.id).gte('date', start3mStr),
    sb.from('emergency_transactions').select('*').eq('user_id', currentUser.id).order('date', { ascending: false }).order('created_at', { ascending: false })
  ]);

  const fund    = fundRes.data;
  const current = Number(fund?.current_amount || 0);
  const target  = Number(fund?.target_amount  || 0);
  const pct     = target > 0 ? Math.min(100, Math.round(current / target * 100)) : 0;
  const txs     = txRes.data || [];

  _emergencyTxCache     = txs;
  _emergencyFundCurrent = current;

  const totalExp3m = (expRes.data || []).reduce((s, e) => s + Number(e.amount), 0);
  const avgMonthly = totalExp3m / 3;
  const monthsProt = avgMonthly > 0 ? (current / avgMonthly).toFixed(1) : null;

  const barColor = pct >= 100 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--info)';
  const missing  = Math.max(0, target - current);
  const recMin   = avgMonthly > 0 ? fmt(avgMonthly * 3) : null;
  const recMax   = avgMonthly > 0 ? fmt(avgMonthly * 6) : null;

  render(appShell(`
    <div class="page-header">
      <div>
        <div class="page-title">Reserva de emergência</div>
        <div class="page-subtitle">Fundo para imprevistos</div>
      </div>
    </div>

    <div class="card emerg-status-card">
      <div class="emerg-current-label">Reserva actual</div>
      <div class="emerg-current-amount">${sym} ${fmt(current)}</div>
      <div class="emerg-progress">
        <div class="emerg-progress-header">
          <span class="emerg-pct" style="color:${barColor}">${pct}%</span>
          <span>Objectivo: ${sym} ${fmt(target)}</span>
        </div>
        <div class="bar-track" style="height:12px">
          <div class="bar-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
      </div>
      <div class="emerg-stats">
        <div class="emerg-stat">
          <div class="emerg-stat-value">${monthsProt !== null ? monthsProt : '—'}</div>
          <div class="emerg-stat-label">Meses de proteção</div>
        </div>
        <div class="emerg-stat">
          <div class="emerg-stat-value" style="color:${pct >= 100 ? 'var(--success)' : 'var(--danger)'}">
            ${pct >= 100 ? '🎉' : `${sym} ${fmt(missing)}`}
          </div>
          <div class="emerg-stat-label">${pct >= 100 ? 'Objectivo atingido' : 'Em falta'}</div>
        </div>
        <div class="emerg-stat">
          <div class="emerg-stat-value">${avgMonthly > 0 ? `${sym} ${fmt(avgMonthly)}` : '—'}</div>
          <div class="emerg-stat-label">Despesa média/mês</div>
        </div>
      </div>
    </div>

    <div class="card" id="emerg-mov-card" style="margin-top:1rem;">
      <div class="dash-section-title">Registar movimento</div>
      <div id="emerg-alert" class="alert alert-error"></div>
      <div class="income-form-grid">
        <div class="form-group">
          <label>Tipo</label>
          <select id="emerg-type">
            <option value="deposit">💰 Depósito</option>
            <option value="withdraw">💸 Levantamento</option>
          </select>
        </div>
        <div class="form-group">
          <label>Valor</label>
          <div class="input-prefix">
            <span>${sym}</span>
            <input id="emerg-amount" type="number" min="0.01" step="0.01" placeholder="0.00" />
          </div>
        </div>
        <div class="form-group">
          <label>Data</label>
          <input id="emerg-date" type="date" value="${todayStr}" />
        </div>
        <div class="form-group">
          <label>Comentário <span class="label-opt">(opcional)</span></label>
          <input id="emerg-desc" type="text" placeholder="ex: Poupança de Junho, Urgência médica…" />
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:center;margin-top:0.5rem;">
        <button class="btn btn-primary" id="emerg-mov-btn" onclick="submitEmergencyMovement(${current})">Confirmar movimento</button>
        <button class="btn btn-secondary" id="emerg-mov-cancel" onclick="cancelEditEmergencyTx()" style="display:none;">Cancelar edição</button>
      </div>
    </div>

    <div class="card" style="margin-top:1rem;">
      <div class="dash-section-title">Definir objectivo</div>
      <div id="emerg-target-alert" class="alert alert-error"></div>
      <div class="form-group">
        <label>Valor objectivo</label>
        <div class="input-prefix">
          <span>${sym}</span>
          <input id="emerg-target" type="number" min="0.01" step="0.01" placeholder="0.00" value="${target > 0 ? target : ''}" />
        </div>
      </div>
      ${recMin ? `<p class="emerg-rec">Recomendação: 3–6 meses de despesas &mdash; ${sym} ${recMin} a ${sym} ${recMax}</p>` : '<p class="emerg-rec">Recomendação: tipicamente 3 a 6 meses de despesas mensais.</p>'}
      <button class="btn btn-primary" id="emerg-target-btn" onclick="submitEmergencyTarget(${current})">Actualizar objectivo</button>
    </div>

    <div class="card" style="margin-top:1rem;">
      <div class="dash-section-title">Histórico de movimentos</div>
      ${txs.length === 0
        ? `<p class="progress-hint">Ainda não há movimentos registados.</p>`
        : txs.map(t => emergTxRow(t, sym, current)).join('')
      }
    </div>
  `, 'emergency'));
}

function emergTxRow(t, sym, currentFund) {
  const isDeposit = Number(t.amount) > 0;
  const color     = isDeposit ? 'var(--success)' : 'var(--danger)';
  const sign      = isDeposit ? '+' : '';
  const icon      = isDeposit ? '💰' : '💸';
  const label     = isDeposit ? 'Depósito' : 'Levantamento';
  const date      = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
  return `
    <div class="income-item">
      <div class="income-item-left">
        <span class="income-type-badge" style="background:${color}22;color:${color};border-color:${color}44">${icon} ${label}</span>
        <span class="income-desc">${t.description || ''}</span>
      </div>
      <div class="income-item-right">
        <span class="income-amount" style="color:${color}">${sign}${sym} ${fmt(Math.abs(Number(t.amount)))}</span>
        <span class="income-date">${date}</span>
        <button class="btn-edit"   onclick="editEmergencyTx('${t.id}')"                                        title="Editar">&#9998;</button>
        <button class="btn-delete" onclick="deleteEmergencyTx('${t.id}', ${Number(t.amount)}, ${currentFund})" title="Apagar">&#10005;</button>
      </div>
    </div>`;
}

async function submitEmergencyMovement(currentAmount) {
  const type    = document.getElementById('emerg-type').value;
  const amount  = parseFloat(document.getElementById('emerg-amount').value);
  const date    = document.getElementById('emerg-date').value;
  const desc    = document.getElementById('emerg-desc').value.trim();
  const btn     = document.getElementById('emerg-mov-btn');
  const alertEl = document.getElementById('emerg-alert');
  alertEl.className = 'alert alert-error';

  if (!amount || amount <= 0) {
    alertEl.textContent = 'Introduz um valor válido.';
    alertEl.classList.add('show');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'A guardar…';

  const signedAmount = type === 'deposit' ? amount : -amount;
  const { data: fund } = await sb.from('emergency_fund').select('target_amount').eq('user_id', currentUser.id).maybeSingle();
  const targetAmount = Number(fund?.target_amount || 0);

  let error;

  if (editingEmergencyTxId) {
    const oldTx = _emergencyTxCache.find(x => x.id === editingEmergencyTxId);
    const oldAmount = Number(oldTx?.amount || 0);
    const newCurrent = Math.max(0, _emergencyFundCurrent - oldAmount + signedAmount);

    const [fundRes, txRes] = await Promise.all([
      sb.from('emergency_fund').upsert({
        user_id: currentUser.id, current_amount: newCurrent,
        target_amount: targetAmount, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }),
      sb.from('emergency_transactions').update({
        amount: signedAmount, description: desc || null,
        date: date || new Date().toISOString().split('T')[0]
      }).eq('id', editingEmergencyTxId).eq('user_id', currentUser.id)
    ]);
    error = fundRes.error || txRes.error;
    editingEmergencyTxId = null;
  } else {
    const newCurrent = type === 'deposit'
      ? currentAmount + amount
      : Math.max(0, currentAmount - amount);

    const [fundRes, txRes] = await Promise.all([
      sb.from('emergency_fund').upsert({
        user_id: currentUser.id, current_amount: newCurrent,
        target_amount: targetAmount, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }),
      sb.from('emergency_transactions').insert({
        user_id: currentUser.id, amount: signedAmount,
        description: desc || null,
        date: date || new Date().toISOString().split('T')[0]
      })
    ]);
    error = fundRes.error || txRes.error;
  }

  if (error) {
    alertEl.textContent = 'Erro: ' + error.message;
    alertEl.classList.add('show');
    btn.disabled    = false;
    btn.textContent = editingEmergencyTxId ? 'Actualizar movimento' : 'Confirmar movimento';
    return;
  }

  await renderEmergencyFund();
}

function editEmergencyTx(id) {
  const t = _emergencyTxCache.find(x => x.id === id);
  if (!t) return;
  editingEmergencyTxId = id;
  document.getElementById('emerg-type').value   = Number(t.amount) > 0 ? 'deposit' : 'withdraw';
  document.getElementById('emerg-amount').value = Math.abs(Number(t.amount));
  document.getElementById('emerg-date').value   = t.date;
  document.getElementById('emerg-desc').value   = t.description || '';
  document.getElementById('emerg-mov-btn').textContent        = 'Actualizar movimento';
  document.getElementById('emerg-mov-cancel').style.display  = 'inline-block';
  document.getElementById('emerg-mov-card').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditEmergencyTx() {
  editingEmergencyTxId = null;
  document.getElementById('emerg-mov-btn').textContent       = 'Confirmar movimento';
  document.getElementById('emerg-mov-cancel').style.display  = 'none';
  document.getElementById('emerg-amount').value              = '';
  document.getElementById('emerg-desc').value                = '';
  document.getElementById('emerg-alert').className           = 'alert alert-error';
}

async function deleteEmergencyTx(id, txAmount, currentFund) {
  const newCurrent = currentFund - txAmount;
  const { data: fund } = await sb.from('emergency_fund').select('target_amount').eq('user_id', currentUser.id).maybeSingle();

  await Promise.all([
    sb.from('emergency_fund').upsert({
      user_id:        currentUser.id,
      current_amount: Math.max(0, newCurrent),
      target_amount:  Number(fund?.target_amount || 0),
      updated_at:     new Date().toISOString()
    }, { onConflict: 'user_id' }),
    sb.from('emergency_transactions').delete().eq('id', id).eq('user_id', currentUser.id)
  ]);

  await renderEmergencyFund();
}

/* ══════════════════════════════════════
   PÁGINA: INVESTIMENTOS
══════════════════════════════════════ */
async function renderInvestments() {
  const sym = currencySymbol();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { data } = await sb.from('investments')
    .select('*').eq('user_id', currentUser.id).order('date', { ascending: false });
  const assets = data || [];

  const totalInvested = assets.reduce((s, a) => s + Number(a.amount), 0);
  const totalCurrent  = assets.reduce((s, a) => s + Number(a.current_value ?? a.amount), 0);
  const absReturn     = totalCurrent - totalInvested;
  const pctReturn     = totalInvested > 0 ? (absReturn / totalInvested * 100) : 0;

  const byType = {};
  assets.forEach(a => {
    byType[a.type] = (byType[a.type] || 0) + Number(a.current_value ?? a.amount);
  });

  render(appShell(`
    <div class="page-header">
      <div>
        <div class="page-title">Investimentos</div>
        <div class="page-subtitle">Composição da carteira</div>
      </div>
    </div>

    ${assets.length > 0 ? invSummaryCard(totalInvested, totalCurrent, absReturn, pctReturn, sym) : ''}
    ${assets.length > 0 ? invCompositionCard(byType, totalCurrent, sym) : ''}

    <div class="card" style="margin-top:1rem;">
      <div class="dash-section-title">Adicionar activo</div>
      <div id="inv-alert" class="alert alert-error"></div>
      <div class="inv-form-grid">
        <div class="form-group">
          <label>Tipo</label>
          <select id="inv-type">
            ${INVESTMENT_TYPES.map(t => `<option value="${t.name}">${t.icon} ${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Nome</label>
          <input id="inv-name" type="text" placeholder="ex: IWDA, Bitcoin, Apartamento…" />
        </div>
        <div class="form-group">
          <label>Data</label>
          <input id="inv-date" type="date" value="${todayStr}" />
        </div>
        <div class="form-group">
          <label>Valor investido</label>
          <div class="input-prefix">
            <span>${sym}</span>
            <input id="inv-amount" type="number" min="0.01" step="0.01" placeholder="0.00" />
          </div>
        </div>
        <div class="form-group">
          <label>Valor actual <span class="label-opt">(opcional)</span></label>
          <div class="input-prefix">
            <span>${sym}</span>
            <input id="inv-current" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
        </div>
        <div class="form-group">
          <label>Descrição <span class="label-opt">(opcional)</span></label>
          <input id="inv-desc" type="text" placeholder="Notas sobre o activo" />
        </div>
      </div>
      <button class="btn btn-primary" id="inv-btn" onclick="submitInvestment()">Adicionar activo</button>
    </div>

    ${assets.length > 0 ? `
    <div class="card" style="margin-top:1rem;">
      <div class="dash-section-title">Carteira — ${assets.length} activo${assets.length !== 1 ? 's' : ''}</div>
      ${assets.map(a => invRow(a, sym)).join('')}
    </div>` : ''}
  `, 'investments'));
}

function invSummaryCard(invested, current, absReturn, pctReturn, sym) {
  const color = absReturn >= 0 ? 'var(--success)' : 'var(--danger)';
  const sign  = absReturn >= 0 ? '+' : '';
  return `
    <div class="card inv-summary-card">
      <div class="inv-summary-grid">
        <div class="inv-summary-item">
          <div class="inv-summary-label">Total investido</div>
          <div class="inv-summary-value">${sym} ${fmt(invested)}</div>
        </div>
        <div class="inv-summary-item">
          <div class="inv-summary-label">Valor actual</div>
          <div class="inv-summary-value">${sym} ${fmt(current)}</div>
        </div>
        <div class="inv-summary-item">
          <div class="inv-summary-label">Rentabilidade</div>
          <div class="inv-summary-value" style="color:${color}">${sign}${pctReturn.toFixed(1)}%</div>
          <div class="inv-summary-abs" style="color:${color}">${sign}${sym} ${fmt(Math.abs(absReturn))}</div>
        </div>
      </div>
    </div>`;
}

function invCompositionCard(byType, totalCurrent, sym) {
  const items = INVESTMENT_TYPES
    .filter(t => byType[t.name])
    .map(t => {
      const val = byType[t.name];
      const pct = totalCurrent > 0 ? Math.round(val / totalCurrent * 100) : 0;
      return `
        <div class="prog-item">
          <div class="prog-header">
            <span class="prog-label">${t.icon} ${t.name}</span>
            <span class="prog-values">${sym} ${fmt(val)} <span class="prog-sep">·</span> ${pct}%</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill" style="width:${pct}%;background:${t.color}"></div>
          </div>
        </div>`;
    }).join('');
  return `
    <div class="card" style="margin-top:1rem;">
      <div class="dash-section-title">Composição</div>
      <div class="progress-list">${items}</div>
    </div>`;
}

function invRow(a, sym) {
  const t        = INVESTMENT_TYPES.find(x => x.name === a.type) || { color: '#6b7280', icon: '📦' };
  const invested = Number(a.amount);
  const current  = Number(a.current_value ?? a.amount);
  const absRet   = current - invested;
  const pctRet   = invested > 0 ? (absRet / invested * 100) : 0;
  const retColor = absRet >= 0 ? 'var(--success)' : 'var(--danger)';
  const sign     = absRet >= 0 ? '+' : '';
  const date     = new Date(a.date + 'T00:00:00').toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const hasVal   = a.current_value !== null && a.current_value !== undefined;

  return `
    <div class="inv-item">
      <div class="inv-item-top">
        <span class="income-type-badge" style="background:${t.color}22;color:${t.color};border-color:${t.color}44">${t.icon} ${a.type}</span>
        <span class="inv-name">${a.name}</span>
        ${hasVal ? `<span class="inv-return" style="color:${retColor}">${sign}${pctRet.toFixed(1)}%</span>` : ''}
        <button class="btn-delete" onclick="deleteInvestment('${a.id}')" title="Apagar">&#10005;</button>
      </div>
      <div class="inv-item-vals">
        <span>${sym} ${fmt(invested)}</span>
        ${hasVal ? `<span class="inv-arrow">→</span><span style="color:${retColor}">${sym} ${fmt(current)}</span>` : ''}
        <span class="inv-date-val">${date}</span>
      </div>
      ${a.description ? `<div class="inv-item-desc">${a.description}</div>` : ''}
    </div>`;
}

async function submitInvestment() {
  const type    = document.getElementById('inv-type').value;
  const name    = document.getElementById('inv-name').value.trim();
  const amount  = parseFloat(document.getElementById('inv-amount').value);
  const curRaw  = document.getElementById('inv-current').value;
  const current = curRaw ? parseFloat(curRaw) : null;
  const date    = document.getElementById('inv-date').value;
  const desc    = document.getElementById('inv-desc').value.trim();
  const btn     = document.getElementById('inv-btn');
  const alertEl = document.getElementById('inv-alert');
  alertEl.className = 'alert alert-error';

  if (!name) {
    alertEl.textContent = 'Introduz o nome do activo.';
    alertEl.classList.add('show');
    return;
  }
  if (!amount || amount <= 0) {
    alertEl.textContent = 'Introduz um valor investido válido.';
    alertEl.classList.add('show');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'A adicionar…';

  const { error } = await sb.from('investments').insert({
    user_id:       currentUser.id,
    type,
    name,
    amount,
    current_value: current,
    date,
    description:   desc || null
  });

  if (error) {
    alertEl.textContent = 'Erro: ' + error.message;
    alertEl.classList.add('show');
    btn.disabled    = false;
    btn.textContent = 'Adicionar activo';
    return;
  }

  await renderInvestments();
}

async function deleteInvestment(id) {
  await sb.from('investments').delete().eq('id', id).eq('user_id', currentUser.id);
  await renderInvestments();
}

async function submitEmergencyTarget(currentAmount) {
  const target  = parseFloat(document.getElementById('emerg-target').value);
  const btn     = document.getElementById('emerg-target-btn');
  const alertEl = document.getElementById('emerg-target-alert');
  alertEl.className = 'alert alert-error';

  if (!target || target <= 0) {
    alertEl.textContent = 'Introduz um objectivo válido.';
    alertEl.classList.add('show');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'A guardar…';

  const { error } = await sb.from('emergency_fund').upsert({
    user_id:        currentUser.id,
    current_amount: currentAmount,
    target_amount:  target,
    updated_at:     new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) {
    alertEl.textContent = 'Erro: ' + error.message;
    alertEl.classList.add('show');
    btn.disabled    = false;
    btn.textContent = 'Actualizar objectivo';
    return;
  }

  await renderEmergencyFund();
}

/* ══════════════════════════════════════
   PÁGINA: MAIS
══════════════════════════════════════ */
async function renderMore() {
  const alerts = await computeAlerts();
  _alertsCount = alerts.filter(a => a.severity === 'danger' || a.severity === 'warning').length;
  const badge = _alertsCount > 0 ? `<span class="more-badge">${_alertsCount}</span>` : '';
  render(appShell(`
    <div class="page-header">
      <div>
        <div class="page-title">Mais</div>
        <div class="page-subtitle">Calendário, relatórios e alertas</div>
      </div>
    </div>
    <div class="more-grid">
      <button class="more-card" onclick="navigate('calendar')">
        <div class="more-card-icon">📅</div>
        <div class="more-card-title">Calendário</div>
        <div class="more-card-desc">Vista mensal de todas as transacções</div>
      </button>
      <button class="more-card" onclick="navigate('reports')">
        <div class="more-card-icon">📊</div>
        <div class="more-card-title">Relatórios</div>
        <div class="more-card-desc">Análise mensal e anual dos dados financeiros</div>
      </button>
      <button class="more-card" onclick="navigate('alerts')" style="position:relative">
        ${badge}
        <div class="more-card-icon">🔔</div>
        <div class="more-card-title">Alertas</div>
        <div class="more-card-desc">Avisos e notificações financeiras</div>
      </button>
    </div>
  `, 'more'));
}

/* ══════════════════════════════════════
   PÁGINA: CALENDÁRIO
══════════════════════════════════════ */
async function renderCalendar() {
  const sym   = currencySymbol();
  const [year, mon] = viewMonth.split('-').map(Number);
  const label = new Date(year, mon - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' });
  const start = `${viewMonth}-01`;
  const end   = `${viewMonth}-${String(new Date(year, mon, 0).getDate()).padStart(2, '0')}`;
  const uid   = currentUser.id;

  const [incRes, expRes, invRes, emgRes] = await Promise.all([
    sb.from('income').select('*').eq('user_id', uid).gte('date', start).lte('date', end),
    sb.from('expenses').select('*').eq('user_id', uid).gte('date', start).lte('date', end),
    sb.from('investments').select('*').eq('user_id', uid).gte('date', start).lte('date', end),
    sb.from('emergency_transactions').select('*').eq('user_id', uid).gte('date', start).lte('date', end),
  ]);

  _calendarData = buildCalendarData(
    incRes.data || [], expRes.data || [], invRes.data || [], emgRes.data || []
  );

  render(appShell(`
    <div class="page-header">
      <div>
        <div class="page-title">Calendário</div>
        <div class="page-subtitle">Vista mensal das tuas transacções</div>
      </div>
    </div>
    <div class="card">
      <div class="month-nav">
        <button class="btn-month" onclick="changeMonthCalendar(-1)">&#8249;</button>
        <span class="month-label" style="text-transform:capitalize">${label}</span>
        <button class="btn-month" onclick="changeMonthCalendar(1)">&#8250;</button>
      </div>
      <div id="cal-wrap">${renderCalendarGrid(year, mon)}</div>
    </div>
    <div id="cal-day-panel">${renderCalendarDayPanel(sym)}</div>
  `, 'calendar'));
}

function buildCalendarData(income, expenses, investments, emergency) {
  const data = {};
  const add = (dateStr, type, item) => {
    if (!data[dateStr]) data[dateStr] = { income: [], expenses: [], investments: [], emergency: [] };
    data[dateStr][type].push(item);
  };
  income.forEach(r => add(r.date, 'income', r));
  expenses.forEach(r => add(r.date, 'expenses', r));
  investments.forEach(r => add(r.date, 'investments', r));
  emergency.forEach(r => add(r.date, 'emergency', r));
  return data;
}

function renderCalendarGrid(year, mon) {
  const daysInMonth = new Date(year, mon, 0).getDate();
  const firstDay    = new Date(year, mon - 1, 1).getDay();
  const startOffset = (firstDay + 6) % 7; // segunda=0
  const now         = new Date();
  const todayStr    = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

  const headers = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
    .map(h => `<div class="cal-header-cell">${h}</div>`).join('');

  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += `<div class="cal-day other-month"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${year}-${String(mon).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayData  = _calendarData[dateStr] || {};
    const isToday    = dateStr === todayStr;
    const isSelected = dateStr === _selectedCalDay;

    let dots = '';
    if ((dayData.income      || []).length) dots += `<span class="cal-dot" style="background:var(--success)"></span>`;
    if ((dayData.expenses    || []).length) dots += `<span class="cal-dot" style="background:var(--danger)"></span>`;
    if ((dayData.investments || []).length) dots += `<span class="cal-dot" style="background:var(--primary)"></span>`;
    if ((dayData.emergency   || []).length) dots += `<span class="cal-dot" style="background:var(--warning)"></span>`;

    const cls = ['cal-day', isToday ? 'today' : '', isSelected ? 'selected' : ''].filter(Boolean).join(' ');
    cells += `<div class="${cls}" onclick="selectCalendarDay('${dateStr}')">
      <span class="cal-day-num">${d}</span>
      <div class="cal-dots">${dots}</div>
    </div>`;
  }

  const total = startOffset + daysInMonth;
  const pad   = Math.ceil(total / 7) * 7 - total;
  for (let i = 0; i < pad; i++) cells += `<div class="cal-day other-month"></div>`;

  return `<div class="cal-grid">${headers}${cells}</div>`;
}

function renderCalendarDayPanel(sym) {
  if (!_selectedCalDay) return `
    <div class="card" style="text-align:center;color:var(--text2);padding:1.5rem;font-size:0.875rem">
      Selecciona um dia para ver as transacções
    </div>`;

  const dayData  = _calendarData[_selectedCalDay] || {};
  const dateLabel = new Date(_selectedCalDay + 'T00:00:00')
    .toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  let sections = '';

  if ((dayData.income || []).length) {
    sections += `<div class="cal-section-title" style="color:var(--success)">Rendimentos</div>`;
    dayData.income.forEach(r => {
      sections += `<div class="cal-event-item">
        <span class="cal-event-dot" style="background:var(--success)"></span>
        <span class="cal-event-label">${r.type}${r.description ? ` · ${r.description}` : ''}</span>
        <span class="cal-event-amount" style="color:var(--success)">+${sym} ${fmt(r.amount)}</span>
      </div>`;
    });
  }
  if ((dayData.expenses || []).length) {
    sections += `<div class="cal-section-title" style="color:var(--danger)">Despesas</div>`;
    dayData.expenses.forEach(r => {
      sections += `<div class="cal-event-item">
        <span class="cal-event-dot" style="background:var(--danger)"></span>
        <span class="cal-event-label">${r.category}${r.description ? ` · ${r.description}` : ''}</span>
        <span class="cal-event-amount" style="color:var(--danger)">-${sym} ${fmt(r.amount)}</span>
      </div>`;
    });
  }
  if ((dayData.investments || []).length) {
    sections += `<div class="cal-section-title" style="color:var(--primary)">Investimentos</div>`;
    dayData.investments.forEach(r => {
      sections += `<div class="cal-event-item">
        <span class="cal-event-dot" style="background:var(--primary)"></span>
        <span class="cal-event-label">${r.name}${r.description ? ` · ${r.description}` : ''}</span>
        <span class="cal-event-amount" style="color:var(--primary)">${sym} ${fmt(r.amount)}</span>
      </div>`;
    });
  }
  if ((dayData.emergency || []).length) {
    sections += `<div class="cal-section-title" style="color:var(--warning)">Fundo de Emergência</div>`;
    dayData.emergency.forEach(r => {
      const amt   = Number(r.amount);
      const sign  = amt >= 0 ? '+' : '-';
      const lbl   = r.description || (amt >= 0 ? 'Depósito' : 'Levantamento');
      sections += `<div class="cal-event-item">
        <span class="cal-event-dot" style="background:var(--warning)"></span>
        <span class="cal-event-label">${lbl}</span>
        <span class="cal-event-amount" style="color:var(--warning)">${sign}${sym} ${fmt(Math.abs(amt))}</span>
      </div>`;
    });
  }

  if (!sections) sections = `<div style="text-align:center;color:var(--text2);padding:0.5rem 0;font-size:0.875rem">Sem transacções neste dia</div>`;

  return `<div class="card cal-day-panel">
    <div class="cal-panel-date">${dateLabel}</div>
    ${sections}
  </div>`;
}

function selectCalendarDay(dateStr) {
  _selectedCalDay = _selectedCalDay === dateStr ? null : dateStr;
  const [year, mon] = viewMonth.split('-').map(Number);
  const wrapEl  = document.getElementById('cal-wrap');
  const panelEl = document.getElementById('cal-day-panel');
  if (wrapEl)  wrapEl.innerHTML  = renderCalendarGrid(year, mon);
  if (panelEl) panelEl.innerHTML = renderCalendarDayPanel(currencySymbol());
}

function changeMonthCalendar(delta) {
  const [year, mon] = viewMonth.split('-').map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  viewMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  _selectedCalDay = null;
  renderCalendar();
}

/* ══════════════════════════════════════
   PÁGINA: RELATÓRIOS
══════════════════════════════════════ */
async function renderReports() {
  const sym   = currencySymbol();
  const [year, mon] = viewMonth.split('-').map(Number);
  const label = new Date(year, mon - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' });

  const tabsHtml = `
    <div class="report-tabs">
      <button class="report-tab${reportMode === 'monthly' ? ' active' : ''}" onclick="setReportMode('monthly')">Mensal</button>
      <button class="report-tab${reportMode === 'annual'  ? ' active' : ''}" onclick="setReportMode('annual')">Anual (12 meses)</button>
    </div>`;

  const monthNavHtml = reportMode === 'monthly' ? `
    <div class="month-nav" style="margin-bottom:1rem">
      <button class="btn-month" onclick="changeMonthReports(-1)">&#8249;</button>
      <span class="month-label" style="text-transform:capitalize">${label}</span>
      <button class="btn-month" onclick="changeMonthReports(1)">&#8250;</button>
      <button class="btn btn-ghost" onclick="exportCSV()" style="font-size:0.8rem;padding:0.4rem 0.75rem;margin-left:auto;height:auto">⬇ CSV</button>
    </div>` : '';

  let bodyHtml;
  if (reportMode === 'monthly') {
    bodyHtml = await buildMonthlyReport(sym, year, mon);
  } else {
    bodyHtml = await buildAnnualReport(sym);
  }

  render(appShell(`
    <div class="page-header">
      <div>
        <div class="page-title">Relatórios</div>
        <div class="page-subtitle">Análise financeira detalhada</div>
      </div>
    </div>
    ${tabsHtml}
    ${monthNavHtml}
    ${bodyHtml}
  `, 'reports'));

  if (reportMode === 'annual' && _annualChartData) {
    drawBarChart('annual-chart', _annualChartData.labels, _annualChartData.income, _annualChartData.expenses);
  }
}

async function buildMonthlyReport(sym, year, mon) {
  const start = `${viewMonth}-01`;
  const end   = `${viewMonth}-${String(new Date(year, mon, 0).getDate()).padStart(2, '0')}`;
  const uid   = currentUser.id;

  const [profileRes, incRes, expRes, invRes, emergRes, emergTxRes] = await Promise.all([
    sb.from('financial_profiles').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('income').select('*').eq('user_id', uid).gte('date', start).lte('date', end),
    sb.from('expenses').select('*').eq('user_id', uid).gte('date', start).lte('date', end),
    sb.from('investments').select('amount').eq('user_id', uid).gte('date', start).lte('date', end),
    sb.from('emergency_fund').select('current_amount').eq('user_id', uid).maybeSingle(),
    sb.from('emergency_transactions').select('amount').eq('user_id', uid).gte('date', start).lte('date', end),
  ]);

  const profile     = profileRes.data;
  const income      = incRes.data  || [];
  const expenses    = expRes.data  || [];
  const salary      = Number(profile?.monthly_salary || 0);
  const needsBudget = salary * Number(profile?.split_needs ?? 50) / 100;
  const wantsBudget = salary * Number(profile?.split_wants ?? 10) / 100;

  const incomeTotal  = income.reduce((s, r) => s + Number(r.amount), 0);
  const expTotal     = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const invTotal     = (invRes.data || []).reduce((s, i) => s + Number(i.amount), 0);
  const emergTotal   = Number(emergRes.data?.current_amount || 0);
  const emergNetFlow = (emergTxRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
  const disponivel   = incomeTotal - expTotal - invTotal - emergNetFlow;
  const dispColor    = disponivel >= 0 ? 'var(--success)' : 'var(--danger)';

  const spentNeeds = expenses.filter(e => getExpenseSplit(e.category) === 'needs').reduce((s, e) => s + Number(e.amount), 0);
  const spentWants = expenses.filter(e => getExpenseSplit(e.category) === 'wants').reduce((s, e) => s + Number(e.amount), 0);

  _monthlyReportInc = income;
  _monthlyReportExp = expenses;

  const incByType = {};
  income.forEach(r => { incByType[r.type] = (incByType[r.type] || 0) + Number(r.amount); });
  const incTypeHtml = Object.keys(incByType).length === 0
    ? '<p class="progress-hint">Sem rendimentos neste mês</p>'
    : Object.entries(incByType).map(([type, amt]) => `
      <div class="split-sum-item">
        <div class="split-sum-dot" style="background:var(--success)"></div>
        <div class="split-sum-body">
          <div class="split-sum-label">${type}</div>
          <div class="split-sum-amount">${sym} ${fmt(amt)}</div>
          <div class="split-sum-pct">${incomeTotal > 0 ? Math.round(amt / incomeTotal * 100) : 0}%</div>
        </div>
      </div>`).join('');

  return `
    <div class="overview-grid" style="margin-bottom:1rem">
      <div class="report-stat-card"><div class="report-stat-label">Recebido</div><div class="report-stat-val" style="color:var(--success)">${sym} ${fmt(incomeTotal)}</div></div>
      <div class="report-stat-card"><div class="report-stat-label">Gasto</div><div class="report-stat-val" style="color:var(--danger)">${sym} ${fmt(expTotal)}</div></div>
      <div class="report-stat-card"><div class="report-stat-label">Investido</div><div class="report-stat-val" style="color:var(--primary)">${sym} ${fmt(invTotal)}</div></div>
      <div class="report-stat-card"><div class="report-stat-label">Disponível</div><div class="report-stat-val" style="color:${dispColor}">${disponivel < 0 ? '-' : ''}${sym} ${fmt(Math.abs(disponivel))}</div></div>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div class="dash-section-title">Despesas vs Orçamento</div>
      <div style="margin-top:0.75rem">
        ${progressItem('Necessidades', spentNeeds, needsBudget, sym, 'var(--info)')}
        ${progressItem('Lazer / Desejos', spentWants, wantsBudget, sym, 'var(--primary)')}
      </div>
    </div>
    <div class="card" style="margin-bottom:1rem">
      <div class="dash-section-title">Rendimentos por tipo</div>
      <div style="margin-top:0.75rem">${incTypeHtml}</div>
    </div>
    <div class="card">
      <div class="dash-section-title">Fundo de Emergência</div>
      <div style="color:var(--text2);font-size:0.875rem;margin-top:0.5rem">Saldo actual: <span style="color:var(--warning);font-weight:600">${sym} ${fmt(emergTotal)}</span></div>
    </div>`;
}

async function buildAnnualReport(sym) {
  const now     = new Date();
  const d12ago  = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const yearStart = `${d12ago.getFullYear()}-${String(d12ago.getMonth() + 1).padStart(2, '0')}-01`;
  const yearEnd   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const uid = currentUser.id;

  const [incRes, expRes] = await Promise.all([
    sb.from('income').select('amount, date').eq('user_id', uid).gte('date', yearStart).lte('date', yearEnd),
    sb.from('expenses').select('amount, date').eq('user_id', uid).gte('date', yearStart).lte('date', yearEnd),
  ]);

  const incByMonth = {}, expByMonth = {};
  (incRes.data || []).forEach(r => { const m = r.date.slice(0,7); incByMonth[m] = (incByMonth[m]||0) + Number(r.amount); });
  (expRes.data || []).forEach(r => { const m = r.date.slice(0,7); expByMonth[m] = (expByMonth[m]||0) + Number(r.amount); });

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }

  const labels       = months.map(m => new Date(m+'-01').toLocaleString('pt-PT', { month: 'short' }));
  const incomeData   = months.map(m => incByMonth[m]  || 0);
  const expensesData = months.map(m => expByMonth[m]  || 0);
  _annualChartData   = { labels, income: incomeData, expenses: expensesData };

  const totalInc  = incomeData.reduce((s, v) => s + v, 0);
  const totalExp  = expensesData.reduce((s, v) => s + v, 0);
  const totalDiff = totalInc - totalExp;
  const diffClass = totalDiff >= 0 ? 'val-positive' : 'val-negative';

  const tableRows = months.map((m, i) => {
    const inc  = incomeData[i];
    const exp  = expensesData[i];
    const diff = inc - exp;
    const ml   = new Date(m+'-01').toLocaleString('pt-PT', { month: 'long', year: 'numeric' });
    const dc   = diff >= 0 ? 'val-positive' : 'val-negative';
    return `<tr>
      <td style="text-transform:capitalize;white-space:nowrap">${ml}</td>
      <td class="val-positive">${sym} ${fmt(inc)}</td>
      <td style="color:var(--danger)">${sym} ${fmt(exp)}</td>
      <td class="${dc}">${diff >= 0 ? '+' : '-'}${sym} ${fmt(Math.abs(diff))}</td>
    </tr>`;
  }).join('');

  return `
    <div class="card" style="margin-bottom:1rem">
      <div class="dash-section-title">Últimos 12 meses — Rendimento vs Despesas</div>
      <div class="chart-wrap" style="margin-top:0.75rem">
        <canvas id="annual-chart"></canvas>
      </div>
      <div style="display:flex;gap:1.5rem;margin-top:0.75rem;font-size:0.8125rem;color:var(--text2)">
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--success);border-radius:2px;margin-right:4px;vertical-align:middle"></span>Rendimento</span>
        <span><span style="display:inline-block;width:12px;height:12px;background:var(--danger);border-radius:2px;margin-right:4px;vertical-align:middle"></span>Despesas</span>
      </div>
    </div>
    <div class="card">
      <div class="dash-section-title">Resumo por mês</div>
      <div style="overflow-x:auto;margin-top:0.75rem">
        <table class="report-table">
          <thead><tr><th>Mês</th><th>Recebido</th><th>Gasto</th><th>Diferença</th></tr></thead>
          <tbody>${tableRows}</tbody>
          <tfoot>
            <tr style="font-weight:700">
              <td>Total</td>
              <td class="val-positive">${sym} ${fmt(totalInc)}</td>
              <td style="color:var(--danger)">${sym} ${fmt(totalExp)}</td>
              <td class="${diffClass}">${totalDiff >= 0 ? '+' : '-'}${sym} ${fmt(Math.abs(totalDiff))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>`;
}

function drawBarChart(canvasId, labels, incomeData, expensesData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const dpr  = window.devicePixelRatio || 1;
  const w    = Math.min(canvas.parentElement?.clientWidth || 320, 600);
  const h    = 180;
  canvas.width        = w * dpr;
  canvas.height       = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const maxVal = Math.max(...incomeData, ...expensesData, 1);
  const n      = labels.length;
  const padL   = 48, padR = 8, padT = 10, padB = 28;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const groupW = chartW / n;
  const barW   = Math.max(groupW * 0.28, 4);
  const barGap = 2;

  [0, 0.5, 1].forEach(pct => {
    const y   = padT + chartH - pct * chartH;
    const val = maxVal * pct;
    ctx.fillStyle   = '#7c7f99';
    ctx.font        = `10px Inter, system-ui, sans-serif`;
    ctx.textAlign   = 'right';
    ctx.textBaseline= 'middle';
    ctx.fillText(val >= 1000 ? `${(val/1000).toFixed(0)}k` : Math.round(val).toString(), padL - 4, y);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
  });

  incomeData.forEach((inc, i) => {
    const exp  = expensesData[i];
    const gx   = padL + i * groupW + (groupW - barW * 2 - barGap) / 2;
    const incH = (inc / maxVal) * chartH;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(gx, padT + chartH - incH, barW, incH);
    const expH = (exp / maxVal) * chartH;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(gx + barW + barGap, padT + chartH - expH, barW, expH);
    ctx.fillStyle    = '#7c7f99';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(labels[i], gx + barW, padT + chartH + 4);
  });
}

function exportCSV() {
  const rows = [['Data', 'Tipo/Categoria', 'Valor', 'Descricao']];
  (_monthlyReportInc || []).forEach(r => rows.push([r.date, r.type,     Number(r.amount).toFixed(2),          r.description || '']));
  (_monthlyReportExp || []).forEach(r => rows.push([r.date, r.category, (-Number(r.amount)).toFixed(2), r.description || '']));
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `mysas-${viewMonth}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function setReportMode(mode) {
  reportMode = mode;
  renderReports();
}

function changeMonthReports(delta) {
  const [year, mon] = viewMonth.split('-').map(Number);
  const d = new Date(year, mon - 1 + delta, 1);
  viewMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  renderReports();
}

/* ══════════════════════════════════════
   SISTEMA DE ALERTAS
══════════════════════════════════════ */
async function computeAlerts() {
  const now       = new Date();
  const dashMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dashStart = `${dashMonth}-01`;
  const dashEnd   = `${dashMonth}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const uid       = currentUser.id;

  const [profileRes, expRes, incRes, invRes, emergRes, emergTxRes] = await Promise.all([
    sb.from('financial_profiles').select('*').eq('user_id', uid).maybeSingle(),
    sb.from('expenses').select('category, amount').eq('user_id', uid).gte('date', dashStart).lte('date', dashEnd),
    sb.from('income').select('amount').eq('user_id', uid).gte('date', dashStart).lte('date', dashEnd),
    sb.from('investments').select('amount').eq('user_id', uid).gte('date', dashStart).lte('date', dashEnd),
    sb.from('emergency_fund').select('current_amount, target_amount').eq('user_id', uid).maybeSingle(),
    sb.from('emergency_transactions').select('amount').eq('user_id', uid).gte('date', dashStart).lte('date', dashEnd),
  ]);

  const profile      = profileRes.data;
  const expenses     = expRes.data || [];
  const salary       = Number(profile?.monthly_salary || 0);
  const needsBudget  = salary * Number(profile?.split_needs ?? 50) / 100;
  const wantsBudget  = salary * Number(profile?.split_wants ?? 10) / 100;
  const incomeTotal  = (incRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
  const expTotal     = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const invMonth     = (invRes.data || []).reduce((s, i) => s + Number(i.amount), 0);
  const emergNetFlow = (emergTxRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
  const disponivel   = incomeTotal - expTotal - invMonth - emergNetFlow;
  const spentNeeds   = expenses.filter(e => getExpenseSplit(e.category) === 'needs').reduce((s, e) => s + Number(e.amount), 0);
  const spentWants   = expenses.filter(e => getExpenseSplit(e.category) === 'wants').reduce((s, e) => s + Number(e.amount), 0);
  const emergCurrent = Number(emergRes.data?.current_amount || 0);
  const emergTarget  = Number(emergRes.data?.target_amount  || 0);
  const sym          = currencySymbol();

  const alerts = [];

  if (disponivel < 0) alerts.push({
    severity: 'danger', page: 'dashboard',
    title: 'Saldo negativo este mês',
    desc:  `Estás a gastar ${sym} ${fmt(Math.abs(disponivel))} acima do que recebes este mês.`
  });
  if (emergCurrent === 0 && emergTarget > 0) alerts.push({
    severity: 'danger', page: 'emergency',
    title: 'Reserva de emergência vazia',
    desc:  'O teu fundo de emergência está a zero. Começa a contribuir o quanto antes.'
  });
  if (spentNeeds > needsBudget && needsBudget > 0) alerts.push({
    severity: 'warning', page: 'expenses',
    title: 'Necessidades acima do orçamento',
    desc:  `Gastaste ${sym} ${fmt(spentNeeds - needsBudget)} acima do limite de ${sym} ${fmt(needsBudget)}.`
  });
  if (spentWants > wantsBudget && wantsBudget > 0) alerts.push({
    severity: 'warning', page: 'expenses',
    title: 'Lazer acima do orçamento',
    desc:  `Gastaste ${sym} ${fmt(spentWants - wantsBudget)} acima do limite de ${sym} ${fmt(wantsBudget)}.`
  });
  if (emergCurrent > 0 && emergTarget > 0 && emergCurrent < emergTarget * 0.5) alerts.push({
    severity: 'warning', page: 'emergency',
    title: 'Reserva abaixo de 50% do objectivo',
    desc:  `O teu fundo está em ${Math.round(emergCurrent / emergTarget * 100)}% do objectivo de ${sym} ${fmt(emergTarget)}.`
  });
  if (spentNeeds > needsBudget * 0.8 && spentNeeds <= needsBudget && needsBudget > 0) alerts.push({
    severity: 'info', page: 'expenses',
    title: 'Necessidades a 80% do limite',
    desc:  `Usaste ${Math.round(spentNeeds / needsBudget * 100)}% do orçamento de Necessidades.`
  });
  if (incomeTotal === 0) alerts.push({
    severity: 'info', page: 'income',
    title: 'Nenhum rendimento registado',
    desc:  'Ainda não registaste rendimentos para o mês actual.'
  });
  if (emergCurrent >= emergTarget && emergTarget > 0) alerts.push({
    severity: 'success', page: 'emergency',
    title: 'Reserva de emergência completa!',
    desc:  `Parabéns! O teu fundo atingiu o objectivo de ${sym} ${fmt(emergTarget)}.`
  });

  return alerts;
}

async function renderAlerts() {
  const alerts = await computeAlerts();
  _alertsCount = alerts.filter(a => a.severity === 'danger' || a.severity === 'warning').length;
  const sevIcon = { danger: '🚨', warning: '⚠️', success: '✅', info: 'ℹ️' };

  const countBadge = alerts.length > 0
    ? `<span class="salary-badge" style="background:color-mix(in srgb, var(--warning) 15%, transparent);color:var(--warning)">${alerts.length} alertas</span>`
    : '';

  const alertsHtml = alerts.length === 0
    ? `<div class="card" style="text-align:center;padding:2rem">
        <div style="font-size:2.5rem;margin-bottom:0.5rem">✅</div>
        <div style="font-weight:600;font-size:1rem;margin-bottom:0.25rem">Tudo em ordem!</div>
        <div style="color:var(--text2);font-size:0.875rem">Não há alertas activos neste momento.</div>
      </div>`
    : alerts.map(a => `
      <div class="alert-item ${a.severity}">
        <div class="alert-sev-icon">${sevIcon[a.severity]}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;margin-bottom:0.25rem">${a.title}</div>
          <div style="font-size:0.8125rem;color:var(--text2)">${a.desc}</div>
        </div>
        <button class="btn btn-ghost" onclick="navigate('${a.page}')" style="font-size:0.8rem;padding:0.4rem 0.75rem;flex-shrink:0;height:auto">Ver</button>
      </div>`).join('');

  render(appShell(`
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
        <div class="page-title">Alertas</div>
        ${countBadge}
      </div>
    </div>
    ${alertsHtml}
  `, 'alerts'));
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
