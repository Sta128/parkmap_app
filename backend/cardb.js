const { Pool } = require('pg')

const pool = new Pool({
  user: 'postgres',
  host: 'postgres',
  database: 'car_data',
  password: 'smart_map',
  port: 5432,
})

module.exports = pool