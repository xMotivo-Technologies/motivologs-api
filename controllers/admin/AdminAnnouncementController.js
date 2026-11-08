const Announcement = require("../../models/Announcement");
const Marquee = require("../../models/Marquee");
const Maintenance = require("../../models/Maintenance");

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

const getMaintenance = async (req, res) => {
  try {
    const maintenance = (await Maintenance.findOne()) || {
      title: "Under Maintenance",
      message: "We're performing scheduled maintenance. Please check back shortly.",
      isEnabled: false,
    };

    return res.status(200).json({ maintenance });
  } catch (error) {
    console.error("Get maintenance error:", error);

    return res.status(500).json({
      message: "Unable to retrieve maintenance settings",
    });
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const { title, message, isEnabled } = req.body;

    const maintenance = await Maintenance.findOneAndUpdate(
      {},
      { $set: { title: title ?? "", message: message ?? "", isEnabled: Boolean(isEnabled) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Maintenance settings saved",
      maintenance,
    });
  } catch (error) {
    console.error("Update maintenance error:", error);

    return res.status(500).json({
      message: "Unable to save maintenance settings",
    });
  }
};

module.exports = {
  getAnnouncement,
  updateAnnouncement,
  getMarquee,
  updateMarquee,
  getMaintenance,
  updateMaintenance,
};
