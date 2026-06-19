const router = require('express').Router();
const db = require('../../db');
const requireAuth = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM financial_profiles WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ profile: result.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao obter perfil' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  const { monthly_salary, split_needs, split_savings, split_emergency, split_wants } = req.body;

  const total = Number(split_needs) + Number(split_savings) + Number(split_emergency) + Number(split_wants);
  if (total !== 100)
    return res.status(400).json({ error: 'As percentagens devem somar 100%' });

  if (Number(monthly_salary) <= 0)
    return res.status(400).json({ error: 'O salário deve ser maior que zero' });

  try {
    const result = await db.query(
      `UPDATE financial_profiles
       SET monthly_salary = $1, split_needs = $2, split_savings = $3,
           split_emergency = $4, split_wants = $5, updated_at = NOW()
       WHERE user_id = $6 RETURNING *`,
      [monthly_salary, split_needs, split_savings, split_emergency, split_wants, req.user.id]
    );
    res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

module.exports = router;
