const Maintenance = require("../models/Maintenance");

// Hard-blocks every route in whichever router file calls `router.use(maintenanceGate)`
// when maintenance mode is on. Applied only to the files backing genuinely
// authenticated pages (fivesim, wallet, transactions, logs, announcements,
// and the post-login half of AuthRoute) — never to admin routes, the Paystack
// webhook, the public maintenance-status check, or the pre-login auth
// endpoints (login/signup/forgot-password/reset-password/logout), so the
// homepage and sign-in flow keep working and there's always a way to turn
// this back off.
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
