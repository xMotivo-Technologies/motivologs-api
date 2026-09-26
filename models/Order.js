const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true, unique: true }, // 5sim's own order id
    reference: { type: String }, // the wallet Transaction reference this order paid with
    phone: { type: String },
    code: { type: String, default: null },
    service: { type: String, required: true },
    country: { type: String },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "expired"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const OrderModel = mongoose.model("Order", orderSchema);
module.exports = OrderModel;
