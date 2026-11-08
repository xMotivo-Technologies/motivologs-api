const { Schema, model } = require("mongoose");

// Singleton — same pattern as Announcement/Marquee, one document found with
// findOne() and replaced with findOneAndUpdate(..., { upsert: true }). When
// isEnabled, every customer-facing route is hard-blocked (see
// middleware/maintenanceGate.js) — the admin panel is never affected.
const maintenanceSchema = new Schema(
  {
    title: { type: String, default: "Under Maintenance" },
    message: { type: String, default: "We're performing scheduled maintenance. Please check back shortly." },
    isEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model("Maintenance", maintenanceSchema);
