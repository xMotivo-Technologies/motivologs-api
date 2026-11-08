const express = require("express");
const authToken = require("../../middleware/auth");
const maintenanceGate = require("../../middleware/maintenanceGate");
const {
  getCategories,
  getGroups,
  getCategorySubgroups,
  getListings,
  getListing,
  purchase,
  getMyOrders,
  getOrder,
} = require("../../controllers/logs/LogsController");

const router = express.Router();

router.use(maintenanceGate);

router.get("/logs/categories", authToken, getCategories);
router.get("/logs/groups", authToken, getGroups);
router.get("/logs/categories/:categoryId/subgroups", authToken, getCategorySubgroups);
router.get("/logs/listings", authToken, getListings);
router.get("/logs/listings/:slug", authToken, getListing);
router.post("/logs/purchase", authToken, purchase);
router.get("/logs/orders", authToken, getMyOrders);
router.get("/logs/orders/:orderId", authToken, getOrder);

module.exports = router;
