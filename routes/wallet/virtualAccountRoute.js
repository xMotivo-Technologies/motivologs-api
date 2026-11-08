const express = require('express')
const { createVirtualAccount, getVirtualAccount } = require('../../controllers/wallet/virtualAccountsController')
const authToken = require('../../middleware/auth')
const maintenanceGate = require('../../middleware/maintenanceGate')
const router = express.Router()

router.use(maintenanceGate)

router.post('/create-virtual-account', authToken, createVirtualAccount )
router.get('/get-virtual-account', authToken, getVirtualAccount )   

module.exports = router  