const Announcement = require("../../models/Announcement");
const Marquee = require("../../models/Marquee");

const getAnnouncement = async (req, res) => {
  try {
    const announcement = (await Announcement.findOne()) || { title: "", description: "", isEnabled: false };

    return res.status(200).json({ announcement });
  } catch (error) {
    console.error("Get announcement error:", error);

    return res.status(500).json({
      message: "Unable to retrieve announcement",
    });
  }
};

const updateAnnouncement = async (req, res) => {
  try {
    const { title, description, isEnabled } = req.body;

    const announcement = await Announcement.findOneAndUpdate(
      {},
      { $set: { title: title ?? "", description: description ?? "", isEnabled: Boolean(isEnabled) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Announcement saved",
      announcement,
    });
  } catch (error) {
    console.error("Update announcement error:", error);

    return res.status(500).json({
      message: "Unable to save announcement",
    });
  }
};

const getMarquee = async (req, res) => {
  try {
    const marquee = (await Marquee.findOne()) || { text: "", isEnabled: false };

    return res.status(200).json({ marquee });
  } catch (error) {
    console.error("Get marquee error:", error);

    return res.status(500).json({
      message: "Unable to retrieve marquee",
    });
  }
};

const updateMarquee = async (req, res) => {
  try {
    const { text, isEnabled } = req.body;

    const marquee = await Marquee.findOneAndUpdate(
      {},
      { $set: { text: text ?? "", isEnabled: Boolean(isEnabled) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Marquee saved",
      marquee,
    });
  } catch (error) {
    console.error("Update marquee error:", error);

    return res.status(500).json({
      message: "Unable to save marquee",
    });
  }
};

module.exports = {
  getAnnouncement,
  updateAnnouncement,
  getMarquee,
  updateMarquee,
};
