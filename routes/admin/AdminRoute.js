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
const {
  getAnnouncement,
  updateAnnouncement,
  getMarquee,
  updateMarquee,
} = require("../../controllers/admin/AdminAnnouncementController");
const {
  getAllCategories,
  setCategoryEnabled,
  getLogsMarkup,
  updateLogsMarkup,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getSubgroups,
  createSubgroup,
  updateSubgroup,
  deleteSubgroup,
} = require("../../controllers/admin/AdminLogsController");
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

router.get("/admin/announcement", adminAuth, getAnnouncement);
router.put("/admin/announcement", adminAuth, updateAnnouncement);
router.get("/admin/marquee", adminAuth, getMarquee);
router.put("/admin/marquee", adminAuth, updateMarquee);

router.get("/admin/log-categories", adminAuth, getAllCategories);
router.put("/admin/log-categories/:categoryId", adminAuth, setCategoryEnabled);
router.get("/admin/settings/logs-markup", adminAuth, getLogsMarkup);
router.put("/admin/settings/logs-markup", adminAuth, updateLogsMarkup);

router.get("/admin/log-groups", adminAuth, getGroups);
router.post("/admin/log-groups", adminAuth, createGroup);
router.put("/admin/log-groups/:groupId", adminAuth, updateGroup);
router.delete("/admin/log-groups/:groupId", adminAuth, deleteGroup);

router.get("/admin/log-categories/:categoryId/subgroups", adminAuth, getSubgroups);
router.post("/admin/log-categories/:categoryId/subgroups", adminAuth, createSubgroup);
router.put("/admin/log-subgroups/:subgroupId", adminAuth, updateSubgroup);
router.delete("/admin/log-subgroups/:subgroupId", adminAuth, deleteSubgroup);

module.exports = router;
