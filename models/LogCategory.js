const { Schema, model } = require("mongoose");

// Curates which of YoungPG's categories are actually sellable on our
// storefront — cached title/image so the storefront doesn't need a live
// YoungPG call just to render the category grid.
const logCategorySchema = new Schema(
  {
    categoryId: { type: Number, required: true, unique: true },
    slug: { type: String, required: true },
    title: { type: String, required: true },
    image: { type: String, default: null },
    isEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = model("LogCategory", logCategorySchema);
