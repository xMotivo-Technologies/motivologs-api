const { Schema, model } = require("mongoose");

// Generic key/value store for business values admins need to tweak without
// a server login + redeploy (e.g. flatMarkup). A DB value here wins over the
// matching env var; nothing stored means the env var still applies.
const settingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = model("Setting", settingSchema);
