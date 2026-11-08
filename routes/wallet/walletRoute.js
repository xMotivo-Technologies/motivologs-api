const express = require('express')
const { getWalletBalance } = require('../../controllers/wallet/walletController')
const authToken = require('../../middleware/auth')
const maintenanceGate = require('../../middleware/maintenanceGate')
const router = express.Router()

router.use(maintenanceGate)

router.get('/get-wallet-balance', authToken, getWalletBalance )

module.exports = router 