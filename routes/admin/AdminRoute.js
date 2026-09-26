const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const {
  getAnalytics,
  getAllTransactions,
  getAllOrders,
  getAllUsers,
  getUserDetail,
} = require("../../controllers/admin/AdminController");
const router = express.Router();

router.get("/admin/analytics", adminAuth, getAnalytics);
router.get("/admin/transactions", adminAuth, getAllTransactions);
router.get("/admin/orders", adminAuth, getAllOrders);
router.get("/admin/users", adminAuth, getAllUsers);
router.get("/admin/users/:id", adminAuth, getUserDetail);

module.exports = router;
