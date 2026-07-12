require('dotenv').config()
const express = require('express')
const cors = require('cors')
const parkingsRouter = require('./routes/parkings')

const app = express()
const port = Number(process.env.PORT || 3000)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')

app.disable('x-powered-by')
app.use(cors({ origin: allowedOrigins }))
app.use(express.json({ limit: '100kb' }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/parkings', parkingsRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'server error' })
})

app.listen(port, () => console.log(`ParkMap API listening on port ${port}`))
