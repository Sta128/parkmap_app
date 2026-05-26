const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.DATABASE_URL,
  process.env.DATABASE_KEY
);

// 新規登録(create)
router.post('/', async (req, res) => {
  const { data, error } = await supabase
    .from('parkings')
    .insert(req.body)
    .select();
  if(error) return res.status(500).json({ error: 'server error' });
  res.status(201).json(data);
})

// 一覧取得(read)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('parkings')
    .select('*');
  if(error) return res.status(500).json({ error: 'server error' });
  res.json(data);
})

// 更新(apdate)
router.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('parkings')
    .update({ ...req.body, updated_at: new Date() })
    .eq('id', req.params.id)
    .select();
  if(error) return res.status(500).json({ error: 'server error' });
  res.json(data);
});

// 削除(delete)
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('parkings')
    .delete()
    .eq('id', req.params.id);
  if(error) return res.status(500).json({ error: 'server error' });
  res.status(204).send();
})

module.exports = router;