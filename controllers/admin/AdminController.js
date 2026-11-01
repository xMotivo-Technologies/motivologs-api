const UserModel = require("../../models/User");
const WalletModel = require("../../models/Wallet");
const VirtualAccountModel = require("../../models/VirtualAccounts");
const TransactionModel = require("../../models/Transactions");

// Every revenue-generating service, so analytics/orders never silently drop
// a new one the way Buy Logs ("youngpg_log") was originally left out here.
const PURCHASE_SERVICES = ["5sim_activation", "youngpg_log"];
const REFUND_SERVICES = ["5sim_activation_refund", "youngpg_log_refund"];

// 5sim's own cost field is already numeric; YoungPG's is a decimal string
// ("100.00"), so the two have to be picked out and converted per-service
// rather than just `$ifNull`-ing a single field name.
const PURCHASE_COST_EXPRESSION = {
  $switch: {
    branches: [
      { case: { $eq: ["$meta.service", "5sim_activation"] }, then: { $ifNull: ["$meta.fivesimCostNGN", 0] } },
      { case: { $eq: ["$meta.service", "youngpg_log"] }, then: { $toDouble: { $ifNull: ["$meta.youngpgPriceNGN", "0"] } } },
    ],
    default: 0,
  },
};

// Revenue/cost/profit + a daily breakdown for charts.
const getAnalytics = async (req, res) => {
  try {
    const [revenueAgg] = await TransactionModel.aggregate([
      {
        $match: {
          type: "debit",
          status: "success",
          "meta.service": { $in: PURCHASE_SERVICES },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalCost: { $sum: PURCHASE_COST_EXPRESSION },
          count: { $sum: 1 },
        },
      },
    ]);

    const [refundAgg] = await TransactionModel.aggregate([
      {
        $match: {
          type: "credit",
          "meta.service": { $in: REFUND_SERVICES },
        },
      },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const [pendingAgg] = await TransactionModel.aggregate([
      {
        $match: {
          type: "debit",
          status: "pending",
          "meta.service": { $in: PURCHASE_SERVICES },
        },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Wallet deposits (Paystack funding) never set meta.service.
    const [depositAgg] = await TransactionModel.aggregate([
      {
        $match: {
          type: "credit",
          "meta.service": { $exists: false },
        },
      },
      {
        $group: {
          _id: null,
          totalDeposits: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const dailyBreakdown = await TransactionModel.aggregate([
      {
        $match: {
          type: "debit",
          status: "success",
          "meta.service": { $in: PURCHASE_SERVICES },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalUsers = await UserModel.countDocuments();
    const totalTransactions = await TransactionModel.countDocuments();

    const totalRevenue = revenueAgg?.totalRevenue || 0;
    const totalCost = revenueAgg?.totalCost || 0;

    return res.status(200).json({
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      completedOrders: revenueAgg?.count || 0,
      totalRefunded: refundAgg?.totalRefunded || 0,
      refundedOrders: refundAgg?.count || 0,
      pendingAmount: pendingAgg?.totalPending || 0,
      pendingOrders: pendingAgg?.count || 0,
      totalDeposits: depositAgg?.totalDeposits || 0,
      depositCount: depositAgg?.count || 0,
      totalUsers,
      totalTransactions,
      dailyBreakdown: dailyBreakdown.map((d) => ({
        date: d._id,
        revenue: d.revenue,
        orders: d.orders,
      })),
    });
  } catch (error) {
    console.error("Get analytics error:", error);

    return res.status(500).json({
      message: "Unable to retrieve analytics",
    });
  }
};

const paginationMeta = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page < Math.ceil(total / limit),
  hasPrevPage: page > 1,
});

// Every transaction, across every user.
const getAllTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userId) filter.user = req.query.userId;

    const [transactions, total] = await Promise.all([
      TransactionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username email firstName lastName"),
      TransactionModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: transactions,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Get all transactions error:", error);

    return res.status(500).json({
      message: "Unable to retrieve transactions",
    });
  }
};

// The purchase subset of transactions specifically, i.e. "orders" — SMS and
// Buy Logs both, plus their refunds.
const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      "meta.service": { $in: [...PURCHASE_SERVICES, ...REFUND_SERVICES] },
    };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userId) filter.user = req.query.userId;

    const [orders, total] = await Promise.all([
      TransactionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username email firstName lastName"),
      TransactionModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: orders,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Get all orders error:", error);

    return res.status(500).json({
      message: "Unable to retrieve orders",
    });
  }
};

// Every user, with their wallet balance attached. ?search= matches name,
// username, email, or phone number (case-insensitive, partial match).
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search } = req.query;

    const filter = {};
    if (search?.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { username: regex },
        { email: regex },
        { phoneNumber: regex },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select("-password -refreshToken -resetPasswordToken -resetPasswordExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const wallets = await WalletModel.find({ user: { $in: userIds } });
    const walletByUser = new Map(wallets.map((w) => [String(w.user), w.balance]));

    const data = users.map((u) => ({
      ...u.toObject(),
      balance: walletByUser.get(String(u._id)) ?? 0,
    }));

    return res.status(200).json({
      data,
      pagination: paginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      message: "Unable to retrieve users",
    });
  }
};

// One user's full picture: profile, wallet, virtual account, recent activity.
const getUserDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findById(id).select(
      "-password -refreshToken -resetPasswordToken -resetPasswordExpires",
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const [wallet, virtualAccount, transactions] = await Promise.all([
      WalletModel.findOne({ user: id }),
      VirtualAccountModel.findOne({ user: id }),
      TransactionModel.find({ user: id }).sort({ createdAt: -1 }).limit(50),
    ]);

    return res.status(200).json({
      user,
      wallet,
      virtualAccount,
      transactions,
    });
  } catch (error) {
    console.error("Get user detail error:", error);

    return res.status(500).json({
      message: "Unable to retrieve user",
    });
  }
};

module.exports = {
  getAnalytics,
  getAllTransactions,
  getAllOrders,
  getAllUsers,
  getUserDetail,
};
