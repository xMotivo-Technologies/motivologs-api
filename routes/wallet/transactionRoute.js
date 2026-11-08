const express = require('express')
const { getTransactions } = require('../../controllers/wallet/transactionsController')
const authToken = require('../../middleware/auth')
const maintenanceGate = require('../../middleware/maintenanceGate')
const router = express.Router()

router.use(maintenanceGate)

router.get('/get-transactions', authToken, getTransactions )

module.exports = router 