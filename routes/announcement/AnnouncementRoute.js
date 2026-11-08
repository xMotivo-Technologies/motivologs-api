const express = require("express");
const authToken = require("../../middleware/auth");
const maintenanceGate = require("../../middleware/maintenanceGate");
const {
  getActiveAnnouncement,
  markAnnouncementSeen,
  getActiveMarquee,
} = require("../../controllers/announcement/AnnouncementController");

const router = express.Router();

router.use(maintenanceGate);

router.get("/announcement", authToken, getActiveAnnouncement);
router.post("/announcement/seen", authToken, markAnnouncementSeen);
router.get("/marquee", authToken, getActiveMarquee);

module.exports = router;
