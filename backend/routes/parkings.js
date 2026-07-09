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
    .from('parking')
    .insert(req.body)
    .select();
  if(error) return res.status(500).json({ error: 'server error' });
  res.status(201).json(data);
})

// 料金順検索
router.post('/search', async (req, res) => {
  const {
    start,
    end,
    sortKey = 'fee',
    ascending = true,
    minHeight = null,
    maxFee = null,
  } = req.body

  if (!start || !end) {
    return res.status(400).json({ error: 'start and end are required' })
  }

  const { data, error } = await supabase.rpc('search_parkings', {
    p_start: start,
    p_end: end,
    p_sort_key: sortKey,
    p_ascending: ascending,
    p_min_height: minHeight,
    p_max_fee: maxFee,
  })

  if (error) {
    console.error('search_parkings error:', error)
    return res.status(500).json({ error: 'server error' })
  }

  res.json(data)
})

// 一覧取得(read)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('parking')
    .select('*');
  if(error) return res.status(500).json({ error: 'server error' });
  res.json(data);
})

// 更新(apdate)
router.patch('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('parking')
    .update({ ...req.body, updated_at: new Date() })
    .eq('id', req.params.id)
    .select();
  if(error) return res.status(500).json({ error: 'server error' });
  res.json(data);
});

// 削除(delete)
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('parking')
    .delete()
    .eq('id', req.params.id);
  if(error) return res.status(500).json({ error: 'server error' });
  res.status(204).send();
})

module.exports = router;