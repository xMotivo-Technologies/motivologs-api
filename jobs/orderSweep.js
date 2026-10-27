const fivesimService = require("../services/fivesimService");
const OrderModel = require("../models/Order");
const TransactionModel = require("../models/Transactions");
const { refundOrderIfNeeded } = require("../controllers/fivesim/fivesimController");

const SWEEP_INTERVAL_MS = 2 * 60 * 1000;
const DELAY_BETWEEN_CHECKS_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Catches orders that time out, get cancelled/banned by 5sim, or finish
// successfully while nobody has the SMS Verification page open to poll them
// — without this, a customer who closes the tab before a code arrives (or
// before clicking "Finish Order") never gets refunded or marked complete
// until they come back. This runs independently of any user's browser.
const sweepExpiredOrders = async () => {
  const pendingOrders = await OrderModel.find({ status: "pending" });

  for (const order of pendingOrders) {
    try {
      const fivesimOrder = await fivesimService.checkOrder(order.orderId);

      if (fivesimOrder.sms?.length > 0 && !order.code) {
        await OrderModel.updateOne(
          { _id: order._id },
          { $set: { code: fivesimOrder.sms[0].code } }
        );
      }

      if (["TIMEOUT", "BANNED", "CANCELED"].includes(fivesimOrder.status)) {
        const { refunded } = await refundOrderIfNeeded(order.user, order.orderId, {
          reason: fivesimOrder.status === "BANNED" ? "order_banned" : "order_expired",
          source: "sweep",
        });

        if (refunded) {
          await OrderModel.updateOne(
            { _id: order._id },
            { $set: { status: "expired" } }
          );
        }
      } else if (fivesimOrder.status === "FINISHED") {
        // 5sim already considers this order done (code delivered) — mirror
        // that here instead of leaving it stuck "pending" forever just
        // because the customer never clicked "Finish Order" themselves.
        await TransactionModel.updateOne(
          {
            user: order.user,
            type: "debit",
            status: "pending",
            "meta.orderId": String(order.orderId),
          },
          { $set: { status: "success" } }
        );

        await OrderModel.updateOne(
          { _id: order._id },
          { $set: { status: "completed" } }
        );
      }
    } catch (error) {
      console.error(
        `Order sweep error for order ${order.orderId}:`,
        error.response?.data || error.message
      );
    }

    // 5sim rate-limits rapid sequential requests — space these out so a
    // sweep with several pending orders doesn't trip it.
    await sleep(DELAY_BETWEEN_CHECKS_MS);
  }
};

const startOrderSweep = () => {
  sweepExpiredOrders().catch((err) => console.error("Order sweep failed:", err));

  setInterval(() => {
    sweepExpiredOrders().catch((err) => console.error("Order sweep failed:", err));
  }, SWEEP_INTERVAL_MS);
};

module.exports = { startOrderSweep, sweepExpiredOrders };
