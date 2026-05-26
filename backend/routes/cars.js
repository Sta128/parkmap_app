const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.DATABASE_URL,
  process.env.DATABASE_KEY
)

/**
 * 一覧取得
 */
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .order('id', { ascending: true })
  if (error) return res.status(500).json({ error: 'server error' })
  res.json(data)
})

/**
 * 新規登録
 */
router.post('/', async (req, res) => {
  const { name, height, width, length, ground_clearance } = req.body

  // 最大5台
  const { count, error: countError } = await supabase
    .from('cars')
    .select('*', { count: 'exact', head: true })

  if (countError) return res.status(500).json({ error: 'server error' })

  if (count >= 5) {
    return res.status(400).json({ error: '最大5台までです' })
  }

  const { data, error } = await supabase
    .from('cars')
    .insert({ name, height, width, length, ground_clearance })
    .select()
  if (error) return res.status(500).json({ error: 'server error' })
  res.json(data[0])
})

/**
 * 更新
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, height, width, length, ground_clearance } = req.body

  const { data, error } = await supabase
    .from('cars')
    .update({ name, height, width, length, ground_clearance })
    .eq('id', id)
    .select()
  if (error) return res.status(500).json({ error: 'server error' })
  res.json(data[0])
})

/**
 * 削除
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  const { error } = await supabase
    .from('cars')
    .delete()
    .eq('id', id)
  if (error) return res.status(500).json({ error: 'server error' })
  res.json({ message: 'deleted' })
})

module.exports = router