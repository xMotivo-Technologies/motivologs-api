const Announcement = require("../../models/Announcement");
const Marquee = require("../../models/Marquee");
const UserModel = require("../../models/User");

// Only returns the announcement if it's enabled AND this user hasn't
// dismissed the current version yet (compared by updatedAt, so editing an
// existing announcement in the admin panel makes it resurface for everyone).
const getActiveAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findOne();

    if (!announcement || !announcement.isEnabled) {
      return res.status(200).json({ announcement: null });
    }

    const user = await UserModel.findById(req.user.id).select("lastSeenAnnouncementAt");
    const alreadySeen = user?.lastSeenAnnouncementAt && user.lastSeenAnnouncementAt >= announcement.updatedAt;

    if (alreadySeen) {
      return res.status(200).json({ announcement: null });
    }

    return res.status(200).json({
      announcement: {
        title: announcement.title,
        description: announcement.description,
      },
    });
  } catch (error) {
    console.error("Get active announcement error:", error);

    return res.status(500).json({
      message: "Unable to retrieve announcement",
    });
  }
};

const markAnnouncementSeen = async (req, res) => {
  try {
    await UserModel.updateOne(
      { _id: req.user.id },
      { $set: { lastSeenAnnouncementAt: new Date() } }
    );

    return res.status(200).json({ message: "Marked as seen" });
  } catch (error) {
    console.error("Mark announcement seen error:", error);

    return res.status(500).json({
      message: "Unable to mark announcement as seen",
    });
  }
};

const getActiveMarquee = async (req, res) => {
  try {
    const marquee = await Marquee.findOne();

    if (!marquee || !marquee.isEnabled || !marquee.text) {
      return res.status(200).json({ marquee: null });
    }

    return res.status(200).json({ marquee: { text: marquee.text } });
  } catch (error) {
    console.error("Get active marquee error:", error);

    return res.status(500).json({
      message: "Unable to retrieve marquee",
    });
  }
};

module.exports = {
  getActiveAnnouncement,
  markAnnouncementSeen,
  getActiveMarquee,
};
