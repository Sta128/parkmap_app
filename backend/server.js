console.log('server.js start')
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors())
app.use(express.json())

const carsRouter = require('./routes/cars')
console.log('cars router loaded')

app.use('/cars', carsRouter)

const parkingsRouter = require('./routes/parkings')
console.log('parkings router loaded')

app.use('/parkings', parkingsRouter)

app.listen(3000, () => {
  console.log('server started')
})