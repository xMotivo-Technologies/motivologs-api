const { Schema, model } = require("mongoose");

// Admin-curated keyword split within a single YoungPG category — needed
// because some categories (e.g. "EMAILS") have no real subcategories from
// YoungPG and mix every provider (Gmail, Outlook, Yahoo...) in one pool. A
// subgroup buckets a category's listings by matching any of its keywords
// against the listing title (case-insensitive substring match).
const logSubgroupSchema = new Schema(
  {
    categoryId: { type: Number, required: true },
    title: { type: String, required: true },
    keywords: [{ type: String, required: true }],
    image: { type: String, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = model("LogSubgroup", logSubgroupSchema);
