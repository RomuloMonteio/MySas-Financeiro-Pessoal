# MySas — Financeiro Pessoal

## Stack técnica

- **Frontend**: HTML + CSS + JavaScript vanilla (SPA sem framework)
- **Auth + Base de dados**: Supabase (Auth nativo + PostgreSQL via JS SDK)
- **Deploy**: Vercel (site estático, sem backend Express)
- **CDN**: `@supabase/supabase-js@2` carregado via `<script>` no `index.html`

## Arquitectura

```
Browser → Supabase JS SDK → Supabase (auth.users + tabelas públicas)
```

Não há backend Express. Todas as operações de dados são feitas directamente do frontend com o cliente Supabase. A segurança é garantida por **Row Level Security (RLS)** nas tabelas do Supabase.

## Ficheiros principais

| Ficheiro | Função |
|---|---|
| `index.html` | Shell da SPA — carrega CSS e JS |
| `js/app.js` | Toda a lógica da aplicação (router, páginas, helpers) |
| `css/style.css` | Tema escuro com variáveis CSS |
| `vercel.json` | Configuração Vercel (actualmente `{}` — site estático) |

## Credenciais Supabase (topo de `js/app.js`)

```javascript
const SUPABASE_URL  = 'https://dwruxmnnewxawikvdhly.supabase.co';
const SUPABASE_ANON = 'eyJhbGci...'; // anon/public key — seguro expor no frontend
```

A `SUPABASE_ANON` é a **legacy anon key** (formato `eyJ...`). O RLS protege os dados.

## Regra de design — Mobile first (OBRIGATÓRIO)

O utilizador usa a aplicação **no telemóvel**. Todas as páginas e componentes devem ser desenhados primeiro para mobile e depois expandidos para desktop.

- Layout padrão: **1 coluna**, expandir para mais colunas em ecrãs maiores (`min-width`)
- Touch targets mínimos: **48px de altura** em todos os botões e inputs
- Navegação: **bottom nav** no mobile (fixa em baixo), topbar nav apenas no desktop
- Grids: mobile=1-2 col → tablet=2-3 col → desktop=4 col
- Nunca esconder funcionalidades no mobile — adaptar o layout
- Testar sempre com viewport 390px (iPhone) antes de considerar completo

## Convenções de código

- Funções de página: `renderXxx()` — async quando precisam de dados do Supabase
- Funções de submissão: `submitXxx()`
- Router: `navigate('nome-da-pagina')` — adicionar case no switch em `navigate()`
- App shell (topbar): `appShell(conteúdo)` — usar em todas as páginas autenticadas
- Formatação de moeda: `fmt(n)` — usa `pt-PT` locale
- Símbolo de moeda: `currencySymbol()` — lê `currentUser.user_metadata.currency`
- Erros Supabase: `traduzirErro(msg)` — traduz mensagens de erro para português

## Padrão de query Supabase

```javascript
// Leitura (pode não existir)
const { data } = await sb.from('tabela').select('*').eq('user_id', currentUser.id).maybeSingle();

// Escrita (insert ou update)
const { error } = await sb.from('tabela').upsert({ user_id: currentUser.id, ... }, { onConflict: 'user_id' });
```

## Tabelas Supabase

### `financial_profiles`
```sql
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE
monthly_salary DECIMAL(12,2)
split_needs INTEGER       -- % para necessidades
split_savings INTEGER     -- % para poupança/investimento
split_emergency INTEGER   -- % para reserva de emergência
split_wants INTEGER       -- % para lazer/desejos
updated_at TIMESTAMPTZ
```
RLS activa — utilizador só vê/edita o seu próprio registo.

## Tema CSS (variáveis)

```css
--bg: #0f1117        /* fundo principal */
--bg2: #161820       /* cards e topbar */
--bg3: #1e2030       /* inputs e tracks */
--primary: #7c6aff   /* roxo — acção principal */
--success: #22c55e   /* verde — poupança */
--warning: #f59e0b   /* amarelo — emergência */
--danger: #ef4444    /* vermelho — erros */
--info: #3b82f6      /* azul — necessidades */
```

---

## Fases do projecto

### ✅ Fase 0 — Setup
- Repositório GitHub, Supabase, Vercel configurados
- Autenticação migrada de Express+bcrypt para **Supabase Auth nativo**

### ✅ Fase 1 — Gestão de utilizador
- Criar conta (nome, email, password, moeda) via `supabase.auth.signUp()`
- Login via `supabase.auth.signInWithPassword()`
- Sessão persistente via `supabase.auth.getSession()`
- Perfil financeiro (salário + estratégia de repartição) com preview em tempo real

### ✅ Fase 2 — Dashboard principal
- 4 cards de visão geral (Necessidades, Poupança, Emergência, Lazer)
- Gráfico donut desenhado em canvas (sem dependências externas)
- Barras de progresso mensal por categoria (gastos reais virão na Fase 5)

### 🔄 Fase 3 — Gestão de rendimentos ← PRÓXIMA
- Formulário de adicionar rendimento (tipo, valor, data, descrição)
- Listagem de rendimentos por mês

### ⬜ Fase 4 — Sistema automático de repartição
- Lógica de cálculo 50/25/15/10 (ou percentagens do perfil)
- Aplicar repartição automaticamente ao registar rendimento
- Distinguir valor planeado vs. valor real movido

### ⬜ Fase 5 — Gestão de despesas
- Formulário de despesa (categoria, valor, data)
- Categorias: Casa, Comida, Transporte, Saúde, Lazer, Tecnologia, Outros
- Resumo de gastos do mês por categoria

### ⬜ Fase 6 — Reserva de emergência
- Definir reserva alvo
- Acompanhar valor actual e progresso (%)
- Calcular meses de protecção com base nas despesas médias

### ⬜ Fase 7 — Investimentos
- Adicionar activo (tipo, nome, valor, data, rentabilidade)
- Composição da carteira (% por activo)

### ⬜ Fase 8 — Renda fixa
- Registar depósitos a prazo / aplicações
- Calcular rendimento esperado

### ⬜ Fase 9 — Objectivos financeiros
- Criar meta (nome, valor objectivo, valor actual)
- Mostrar progresso e valor em falta

### ⬜ Fase 10 — Calendário financeiro
- Vista de calendário mensal
- Suporte a despesas recorrentes

### ⬜ Fase 11 — Relatórios
- Relatório mensal (receitas, despesas, investido, poupado)
- Relatório anual com gráficos de evolução
- Exportação para PDF/Excel

### ⬜ Fase 12 — Sistema de alertas
- Alerta de orçamento de categoria ultrapassado
- Alerta de reserva abaixo do objectivo
- Notificação de meta atingida

### ⬜ Fase 14 — Configurações
- Editar percentagens da estratégia de repartição
- Histórico de alterações da estratégia

### ⬜ Segurança
- Autenticação de dois factores (2FA)
- Encriptação de dados sensíveis
- Exportar/apagar dados do utilizador

### ⬜ Versão futura — IA financeira
- Análise de padrões de gastos
- Sugestões personalizadas de poupança

---

## Notas importantes

- **Não usar Live Server** do VS Code — não tem backend. Usar `npm run dev` → `http://localhost:3000` para desenvolvimento local (o Express serve os ficheiros estáticos localmente).
- **GitHub Pages não funciona** para este projecto — usar sempre Vercel.
- O user faz `git push origin main` pelo seu próprio terminal (o terminal do Claude Code não tem credenciais GitHub).
- Após cada fase, o utilizador faz push manualmente.
- A `SUPABASE_ANON` key está hardcoded no `js/app.js` — é seguro porque é uma chave pública e o RLS protege os dados.
