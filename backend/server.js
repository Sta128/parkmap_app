console.log('server.js start')
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const carsRouter = require('./routes/cars')
console.log('cars router loaded')

app.use('/cars', carsRouter)

app.listen(3000, () => {
  console.log('server started')
})