const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const {
  getAnalytics,
  getAllTransactions,
  getAllOrders,
  getAllUsers,
  getUserDetail,
} = require("../../controllers/admin/AdminController");
const {
  getOperatorMappings,
  upsertOperatorMapping,
  deleteOperatorMapping,
} = require("../../controllers/admin/AdminOperatorController");
const {
  getFlatMarkup,
  updateFlatMarkup,
} = require("../../controllers/admin/AdminSettingsController");
const router = express.Router();

router.get("/admin/analytics", adminAuth, getAnalytics);
router.get("/admin/transactions", adminAuth, getAllTransactions);
router.get("/admin/orders", adminAuth, getAllOrders);
router.get("/admin/users", adminAuth, getAllUsers);
router.get("/admin/users/:id", adminAuth, getUserDetail);

router.get("/admin/operator-mappings", adminAuth, getOperatorMappings);
router.post("/admin/operator-mappings", adminAuth, upsertOperatorMapping);
router.delete("/admin/operator-mappings/:id", adminAuth, deleteOperatorMapping);

router.get("/admin/settings/flat-markup", adminAuth, getFlatMarkup);
router.put("/admin/settings/flat-markup", adminAuth, updateFlatMarkup);

module.exports = router;
