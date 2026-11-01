const { Schema, model } = require("mongoose");

// Admin-curated meta-category bundling several YoungPG categories together
// on the storefront (e.g. "Social Media" = Facebook + Instagram + X +
// LinkedIn + Discord). Purely a display grouping — YoungPG itself has no
// concept of this.
const logGroupSchema = new Schema(
  {
    title: { type: String, required: true },
    order: { type: Number, default: 0 }, // lower shows first ("popular" first)
    categoryIds: [{ type: Number }], // LogCategory.categoryId values
    isEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = model("LogGroup", logGroupSchema);
