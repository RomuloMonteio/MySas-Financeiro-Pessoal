const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const requireAuth = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { name, email, password, currency = 'EUR' } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, email e password são obrigatórios' });

  if (password.length < 8)
    return res.status(400).json({ error: 'A password deve ter pelo menos 8 caracteres' });

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Este email já está registado' });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, currency) VALUES ($1, $2, $3, $4) RETURNING id, name, email, currency, created_at',
      [name.trim(), email.toLowerCase(), passwordHash, currency]
    );

    const user = result.rows[0];
    await db.query('INSERT INTO financial_profiles (user_id) VALUES ($1)', [user.id]);

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email e password são obrigatórios' });

  try {
    const result = await db.query(
      'SELECT id, name, email, password_hash, currency FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Email ou password incorretos' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Email ou password incorretos' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '30d' });
    delete user.password_hash;
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, currency, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter utilizador' });
  }
});

module.exports = router;
