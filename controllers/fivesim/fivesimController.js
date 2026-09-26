const fivesimService = require("../../services/fivesimService");
const debitWallet = require("../../services/wallet/debitWallet");
const creditWallet = require("../../services/wallet/creditWallet");
const TransactionModel = require("../../models/Transactions");
const OrderModel = require("../../models/Order");

const getUserProfile = async (req, res) => {
  try {
    const profile = await fivesimService.getUserProfile();

    return res.status(200).json({
      profile,
    });
  } catch (error) {
    console.error(
      "Get user profile error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to retrieve user profile",
    });
  }
};

const getCountries = async (req, res) => {
  try {
    const countries = await fivesimService.getCountries();

    return res.status(200).json({
      countries,
    });
  } catch (error) {
    console.error(
      "Get countries error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to retrieve countries",
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const { country } = req.params;
    const { operator = "any" } = req.query;

    if (!country) {
      return res.status(400).json({
        message: "Country is required",
      });
    }

    const products = await fivesimService.getProducts(
      country,
      operator
    );

    return res.status(200).json({
      products,
    });
  } catch (error) {
    console.error(
      "Get products error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to retrieve products",
    });
  }
};

const buyActivationNumber = async (req, res) => {
  try {
    const {
      country,
      product,
      operator = "any",
    } = req.body;

    if (!country || !product) {
      return res.status(400).json({
        message: "Country and product are required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const userId = req.user.id;

    // Get 5sim prices
    const products = await fivesimService.getProducts(
      country,
      operator
    );

    const productData = products[product];

    if (!productData) {
      return res.status(404).json({
        message: "Product is not available",
      });
    }

    // 5sim's actual price
    const productPrice = Number(productData.cost);

    if (!productPrice || productPrice <= 0) {
      return res.status(400).json({
        message: "Invalid product price",
      });
    }

    // What 5sim actually charges us for this number, frozen at purchase
    // time (not recalculated later, since the exchange rate can change) —
    // this is what makes real profit numbers possible in the admin panel.
    const fivesimPriceUSD = Number(productData.Price);
    const fivesimCostNGN = Math.round(
      fivesimPriceUSD * Number(process.env.MOTIVOLOGS_USD_NGN_RATE)
    );

    console.log(`Customer price: ${productPrice}, 5sim cost: ${fivesimCostNGN}`
    );

    const reference = `ML-ACT-${userId}-${Date.now()}`;

    // Debit customer price. Left "pending" until the order actually
    // completes (code received + finished), gets refunded on cancel/expiry,
    // or gets refunded here if the purchase itself fails.
    await debitWallet(
      userId,
      productPrice,
      reference,
      {
        service: "5sim_activation",
        country,
        product,
        operator,
        productPrice,
        fivesimPriceUSD,
        fivesimCostNGN,
      },
      "pending"
    );

    try {
      const order =
        await fivesimService.buyActivationNumber(
          country,
          product,
          operator
        );

      // 5sim often responds 200 OK with a plain error string (e.g.
      // "no_balance", "no_numbers") instead of an HTTP error status, so a
      // non-throwing response isn't proof of a real order. Treat anything
      // without a proper id/phone as a failure so it hits the refund path
      // below, same as a thrown error would.
      if (!order || typeof order !== "object" || !order.id || !order.phone) {
        throw new Error(
          typeof order === "string"
            ? `5sim could not fulfil this order: ${order}`
            : "5sim did not return a valid order"
        );
      }

      // Link the purchase back to this order so a later cancel can find
      // what to refund.
      await TransactionModel.findOneAndUpdate(
        { reference },
        { $set: { "meta.orderId": String(order.id) } }
      );

      // Persist the order itself — this is what makes phone number and
      // code available in order history, not just for the active order.
      await OrderModel.create({
        user: userId,
        orderId: String(order.id),
        reference,
        phone: order.phone,
        service: product,
        country,
        amount: productPrice,
        status: "pending",
      });

      return res.status(200).json({
        message: "Activation number purchased successfully",
        order,
        amount: productPrice,
      });
    } catch (error) {
      // Refund the FULL amount charged to the customer
      await creditWallet({
        userId,
        amount: productPrice,
        reference: `${reference}-REFUND`,
        source: "SYSTEM",
        meta: {
          service: "5sim_activation_refund",
          originalReference: reference,
          country,
          product,
          operator,
          productPrice,
          // markup,
          // markupPercent,
        },
      });

      await TransactionModel.updateOne(
        { reference },
        { $set: { status: "failed" } }
      );

      throw error;
    }
  } catch (error) {
    console.error(
      "Buy activation number error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message:
        error.message ||
        "Unable to purchase activation number",
    });
  }
};

const buyHostingNumber = async (req, res) => {
  try {
    const {
      country,
      product,
      operator = "any",
    } = req.body;

    if (!country || !product) {
      return res.status(400).json({
        message: "Country and product are required",
      });
    }

    const order = await fivesimService.buyHostingNumber(
      country,
      product,
      operator
    );

    return res.status(200).json({
      message: "Hosting number purchased successfully",
      order,
    });
  } catch (error) {
    console.error(
      "Buy hosting number error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to purchase hosting number",
    });
  }
};

// Refunds the purchase behind `orderId` if it hasn't been refunded yet.
// Shared by checkOrder (auto-refund on expiry) and cancelOrder (manual cancel).
const refundOrderIfNeeded = async (userId, orderId, meta = {}) => {
  // Not filtering by status: "pending" here on purpose — transactions
  // debited before that status existed (or updated some other way) are
  // still legitimately refundable. The existingRefund check below is what
  // actually prevents double-refunding.
  const originalTx = await TransactionModel.findOne({
    user: userId,
    type: "debit",
    "meta.orderId": String(orderId),
  });

  if (!originalTx) {
    return { refunded: false, refundedAmount: 0 };
  }

  const refundReference = `${originalTx.reference}-REFUND`;
  const existingRefund = await TransactionModel.findOne({
    reference: refundReference,
  });

  if (existingRefund) {
    return { refunded: false, refundedAmount: 0 };
  }

  await creditWallet({
    userId,
    amount: originalTx.amount,
    reference: refundReference,
    source: "SYSTEM",
    meta: {
      service: "5sim_activation_refund",
      originalReference: originalTx.reference,
      orderId: String(orderId),
      ...meta,
    },
  });

  await TransactionModel.updateOne(
    { _id: originalTx._id },
    { $set: { status: "failed" } }
  );

  return { refunded: true, refundedAmount: originalTx.amount };
};

const checkOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const order = await fivesimService.checkOrder(orderId);

    // As soon as a code shows up, save it against the order record so it's
    // there in order history — not just visible while this order is active.
    if (order.sms?.length > 0) {
      await OrderModel.updateOne(
        { orderId: String(orderId), code: null },
        { $set: { code: order.sms[0].code } }
      );
    }

    // "TIMEOUT" = expired without ever receiving an SMS. "BANNED" = the
    // number got banned by the target service before a code arrived.
    // Neither is a completed order, so refund the customer the next time
    // we notice either one.
    let refunded = false;
    let refundedAmount = 0;

    if (["TIMEOUT", "BANNED"].includes(order.status)) {
      ({ refunded, refundedAmount } = await refundOrderIfNeeded(
        req.user.id,
        orderId,
        { reason: order.status === "BANNED" ? "order_banned" : "order_expired" }
      ));

      if (refunded) {
        await OrderModel.updateOne(
          { orderId: String(orderId) },
          { $set: { status: "expired" } }
        );
      }
    }

    return res.status(200).json({
      order,
      refunded,
      refundedAmount,
    });
  } catch (error) {
    console.error(
      "Check order error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to check order",
    });
  }
};

const finishOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }

    const order = await fivesimService.finishOrder(orderId);

    if (req.user?.id) {
      await TransactionModel.updateOne(
        {
          user: req.user.id,
          type: "debit",
          status: "pending",
          "meta.orderId": String(orderId),
        },
        { $set: { status: "success" } }
      );

      await OrderModel.updateOne(
        { user: req.user.id, orderId: String(orderId) },
        { $set: { status: "completed" } }
      );
    }

    return res.status(200).json({
      message: "Order finished successfully",
      order,
    });
  } catch (error) {
    console.error(
      "Finish order error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to finish order",
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const order = await fivesimService.cancelOrder(orderId);

    // Refund the customer if we can find the purchase this order came from.
    const { refunded, refundedAmount } = await refundOrderIfNeeded(
      req.user.id,
      orderId,
      { reason: "order_cancelled" }
    );

    await OrderModel.updateOne(
      { user: req.user.id, orderId: String(orderId) },
      { $set: { status: "cancelled" } }
    );

    return res.status(200).json({
      message: refunded
        ? "Order cancelled and refunded successfully"
        : "Order cancelled successfully",
      order,
      refunded,
      refundedAmount,
    });
  } catch (error) {
    console.error(
      "Cancel order error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to cancel order",
    });
  }
};

const banOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }

    const order = await fivesimService.banOrder(orderId);

    return res.status(200).json({
      message: "Order banned successfully",
      order,
    });
  } catch (error) {
    console.error(
      "Ban order error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to ban order",
    });
  }
};

const getSmsInbox = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }

    const inbox = await fivesimService.getSmsInbox(orderId);

    return res.status(200).json({
      inbox,
    });
  } catch (error) {
    console.error(
      "Get SMS inbox error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to retrieve SMS inbox",
    });
  }
};

// The logged-in user's own order history — this is what backs the SMS
// Order History table, with phone number and code persisted per order.
const getMyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      OrderModel.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      OrderModel.countDocuments({ user: req.user.id }),
    ]);

    return res.status(200).json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get my orders error:", error);

    return res.status(500).json({
      message: "Unable to retrieve order history",
    });
  }
};

const getBalance = async (req, res) => {
  try {
    const balance = await fivesimService.getBalance();

    return res.status(200).json({
      balance,
    });
  } catch (error) {
    console.error(
      "Get balance error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Unable to retrieve 5sim balance",
    });
  }
};

module.exports = {
  getUserProfile,
  getCountries,
  getProducts,
  buyActivationNumber,
  buyHostingNumber,
  checkOrder,
  finishOrder,
  cancelOrder,
  banOrder,
  getSmsInbox,
  getBalance,
  getMyOrders,
};