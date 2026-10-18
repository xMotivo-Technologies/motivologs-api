const { Schema, model } = require("mongoose");

// Lets the admin panel override which 5sim operator gets used for a given
// service + country, since success rates vary per operator per service —
// unmapped combinations fall back to MOTIVOLOGS_FIVESIM_OPERATOR.
const operatorMappingSchema = new Schema(
  {
    service: { type: String, required: true, trim: true, lowercase: true },
    country: { type: String, required: true, trim: true, lowercase: true },
    operator: { type: String, required: true, trim: true, lowercase: true },
  },
  { timestamps: true }
);

operatorMappingSchema.index({ service: 1, country: 1 }, { unique: true });

module.exports = model("OperatorMapping", operatorMappingSchema);
