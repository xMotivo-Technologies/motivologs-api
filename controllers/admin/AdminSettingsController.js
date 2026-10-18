const Setting = require("../../models/Setting");

const ENV_DEFAULTS = {
  flatMarkup: () => Number(process.env.MOTIVOLOGS_FLAT_MARKUP ?? 800),
};

// Returns the currently effective flat markup — whatever a purchase would
// actually use right now — plus whether that's a DB override or just the
// env var default, so the admin UI can show which one is active.
const getFlatMarkup = async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "flatMarkup" });
    const envDefault = ENV_DEFAULTS.flatMarkup();
    const isOverridden = setting?.value != null && Number.isFinite(Number(setting.value));

    return res.status(200).json({
      value: isOverridden ? Number(setting.value) : envDefault,
      isOverridden,
      envDefault,
    });
  } catch (error) {
    console.error("Get flat markup error:", error);

    return res.status(500).json({
      message: "Unable to retrieve flat markup",
    });
  }
};

const updateFlatMarkup = async (req, res) => {
  try {
    const { value } = req.body;
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return res.status(400).json({
        message: "Value must be a non-negative number",
      });
    }

    await Setting.findOneAndUpdate(
      { key: "flatMarkup" },
      { $set: { value: numericValue } },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: "Flat markup updated",
      value: numericValue,
    });
  } catch (error) {
    console.error("Update flat markup error:", error);

    return res.status(500).json({
      message: "Unable to update flat markup",
    });
  }
};

module.exports = {
  getFlatMarkup,
  updateFlatMarkup,
};
