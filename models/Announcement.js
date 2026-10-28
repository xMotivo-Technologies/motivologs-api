const { Schema, model } = require("mongoose");

// Singleton — only one document ever exists here, found with findOne() and
// replaced with findOneAndUpdate(..., { upsert: true }). updatedAt is what
// decides whether a user has already seen the current version.
const announcementSchema = new Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    isEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model("Announcement", announcementSchema);
