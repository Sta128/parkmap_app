const express = require('express')
const router = express.Router()
const pool = require('../cardb')

/**
 * 一覧取得
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM cars ORDER BY id ASC'
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

/**
 * 新規登録
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      height,
      width,
      length,
      ground_clearance
    } = req.body

    // 最大5台
    const count = await pool.query(
      'SELECT COUNT(*) FROM cars'
    )

    if (Number(count.rows[0].count) >= 5) {
      return res.status(400).json({
        error: '最大5台までです'
      })
    }

    const result = await pool.query(
      `
      INSERT INTO cars
      (name, height, width, length, ground_clearance)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [name, height, width, length, ground_clearance]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

/**
 * 更新
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const {
      name,
      height,
      width,
      length,
      ground_clearance
    } = req.body

    const result = await pool.query(
      `
      UPDATE cars
      SET
        name = $1,
        height = $2,
        width = $3,
        length = $4,
        ground_clearance = $5
      WHERE id = $6
      RETURNING *
      `,
      [
        name,
        height,
        width,
        length,
        ground_clearance,
        id
      ]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

/**
 * 削除
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    await pool.query(
      'DELETE FROM cars WHERE id = $1',
      [id]
    )

    res.json({ message: 'deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})

module.exports = router