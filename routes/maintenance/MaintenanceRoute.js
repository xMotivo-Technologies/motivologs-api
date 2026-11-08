const express = require("express");
const { getMaintenanceStatus } = require("../../controllers/announcement/AnnouncementController");

const router = express.Router();

// Unauthenticated — must be reachable even for a logged-out visitor, and
// must itself never be behind the maintenance gate.
router.get("/maintenance-status", getMaintenanceStatus);

module.exports = router;
