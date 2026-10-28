const { Schema, model } = require("mongoose");

// Singleton — same pattern as Announcement, one document found with
// findOne() and replaced with findOneAndUpdate(..., { upsert: true }).
const marqueeSchema = new Schema(
  {
    text: { type: String, default: "" },
    isEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model("Marquee", marqueeSchema);
