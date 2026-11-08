const Maintenance = require("../models/Maintenance");

// Hard-blocks every customer-facing route mounted after this middleware in
// index.js when maintenance mode is on. Admin routes, the Paystack webhook,
// and the public maintenance-status check are all mounted BEFORE this and
// so are never affected — otherwise no one could turn it back off.
const maintenanceGate = async (req, res, next) => {
  try {
    const maintenance = await Maintenance.findOne();

    if (maintenance?.isEnabled) {
      return res.status(503).json({
        maintenance: true,
        title: maintenance.title,
        message: maintenance.message,
      });
    }

    return next();
  } catch (error) {
    // A DB hiccup here must never take the whole site down — fail open.
    console.error("Maintenance gate error:", error);
    return next();
  }
};

module.exports = maintenanceGate;
