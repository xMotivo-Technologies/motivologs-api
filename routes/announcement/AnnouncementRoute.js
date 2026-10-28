const express = require("express");
const authToken = require("../../middleware/auth");
const {
  getActiveAnnouncement,
  markAnnouncementSeen,
  getActiveMarquee,
} = require("../../controllers/announcement/AnnouncementController");

const router = express.Router();

router.get("/announcement", authToken, getActiveAnnouncement);
router.post("/announcement/seen", authToken, markAnnouncementSeen);
router.get("/marquee", authToken, getActiveMarquee);

module.exports = router;
