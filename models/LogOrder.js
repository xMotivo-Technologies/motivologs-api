const { Schema, model } = require("mongoose");

// A completed YoungPG purchase. Unlike SMS orders there's no "pending"
// state in normal operation — YoungPG delivers credentials synchronously,
// so a LogOrder only ever gets created once we have a confirmed result.
const logOrderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // YoungPG's own order id/reference — kept for internal/support lookups
    // only. The customer-facing order id is this document's own `_id`, not
    // this field, so YoungPG's identity is never shown to the customer.
    providerOrderId: { type: String },
    slug: { type: String, required: true },
    listingTitle: { type: String, required: true },
    categoryTitle: { type: String },
    // Resolved once at purchase time (subgroup brand logo, or top-level
    // category image) — cheaper and more reliable than re-matching it on
    // every page view.
    image: { type: String, default: null },
    quantity: { type: Number, required: true, default: 1 },
    amount: { type: Number, required: true }, // NGN actually charged to the customer
    // AES-256-GCM encrypted "email:password" strings — see utils/encryption.js.
    credentials: [{ type: String }],
    status: { type: String, enum: ["completed", "failed"], default: "completed" },
  },
  { timestamps: true }
);

module.exports = model("LogOrder", logOrderSchema);
