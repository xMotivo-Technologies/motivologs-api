const express = require("express");

const router = express.Router();

const authToken = require("../../middleware/auth");
const maintenanceGate = require("../../middleware/maintenanceGate");

// Every endpoint here backs the (login-only) SMS Verification pages, even
// the few without their own authToken check, so the whole file is gated.
router.use(maintenanceGate);

const {
  getCountries,
  getProducts,
  buyActivationNumber,
  buyHostingNumber,
  checkOrder,
  finishOrder,
  cancelOrder,
  banOrder,
  getSmsInbox,
  getBalance,
  getUserProfile,
  getMyOrders,
  getOperatorPrices,
} = require("../../controllers/fivesim/fivesimController");

router.get("/profile", getUserProfile);

router.get("/countries", getCountries);

router.get("/products/:country", getProducts);

router.get("/operators/:country/:product", getOperatorPrices);

router.post("/buy/activation", authToken, buyActivationNumber);

router.post("/buy/hosting", authToken, buyHostingNumber);

router.get("/order/:orderId", authToken, checkOrder);

router.post("/order/:orderId/finish", authToken, finishOrder);

router.post("/order/:orderId/cancel", authToken, cancelOrder);

router.post("/order/:orderId/ban", authToken, banOrder);

router.get("/order/:orderId/inbox", authToken, getSmsInbox);

router.get("/balance", authToken, getBalance);

router.get("/orders", authToken, getMyOrders);

module.exports = router;
