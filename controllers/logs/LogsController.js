const mongoose = require("mongoose");
const youngpgService = require("../../services/youngpgService");
const listingsCache = require("../../services/listingsCache");
const debitWallet = require("../../services/wallet/debitWallet");
const creditWallet = require("../../services/wallet/creditWallet");
const TransactionModel = require("../../models/Transactions");
const LogCategory = require("../../models/LogCategory");
const LogGroup = require("../../models/LogGroup");
const LogSubgroup = require("../../models/LogSubgroup");
const LogOrder = require("../../models/LogOrder");
const Setting = require("../../models/Setting");
const { encrypt, decrypt } = require("../../utils/encryption");

const getLogsMarkup = async () => {
  const setting = await Setting.findOne({ key: "logsFlatMarkup" });
  const value = Number(setting?.value);
  return Number.isFinite(value) ? value : 0;
};

const toCustomerPrice = (priceNgn, markup) => {
  const price = Number(priceNgn) + markup;
  // Round to the nearest ₦100, same convention as SMS pricing.
  return Math.round(price / 100) * 100;
};

// Only the categories an admin has curated onto the storefront.
const getCategories = async (req, res) => {
  try {
    const categories = await LogCategory.find({ isEnabled: true }).sort({ title: 1 });

    return res.status(200).json({ categories });
  } catch (error) {
    console.error("Get log categories error:", error);

    return res.status(500).json({
      message: "Unable to retrieve categories",
    });
  }
};

// Groups are a pure display layer on top of YoungPG's own categories — lets
// the storefront bundle e.g. Facebook + Instagram + X under "Social Media".
// Any enabled category not placed in a group by an admin is bucketed into a
// synthesized "Other" group at the end, so nothing is ever hidden just for
// lack of curation.
const getGroups = async (req, res) => {
  try {
    const [groups, categories] = await Promise.all([
      LogGroup.find({ isEnabled: true }).sort({ order: 1, title: 1 }),
      LogCategory.find({ isEnabled: true }).sort({ title: 1 }),
    ]);

    const categoryById = new Map(categories.map((c) => [c.categoryId, c]));
    const grouped = new Set();

    const result = groups
      .map((g) => {
        const memberCategories = g.categoryIds
          .map((id) => categoryById.get(id))
          .filter(Boolean)
          .map((c) => {
            grouped.add(c.categoryId);
            return { categoryId: c.categoryId, slug: c.slug, title: c.title, image: c.image };
          });

        return {
          id: String(g._id),
          title: g.title,
          order: g.order,
          categories: memberCategories,
        };
      })
      .filter((g) => g.categories.length > 0);

    const ungrouped = categories
      .filter((c) => !grouped.has(c.categoryId))
      .map((c) => ({ categoryId: c.categoryId, slug: c.slug, title: c.title, image: c.image }));

    if (ungrouped.length > 0) {
      result.push({ id: "other", title: "Other", order: Infinity, categories: ungrouped });
    }

    return res.status(200).json({ groups: result });
  } catch (error) {
    console.error("Get log groups error:", error);

    return res.status(500).json({
      message: "Unable to retrieve groups",
    });
  }
};

// Admin-curated keyword split within a category (e.g. "EMAILS" has no real
// YoungPG subcategories, so Gmail/Outlook/Yahoo/etc only exist as a title
// keyword match). Empty array means the storefront should just show the
// category as one flat list, same as before this feature existed.
const getCategorySubgroups = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const subgroups = await LogSubgroup.find({ categoryId: Number(categoryId) }).sort({ order: 1, title: 1 });

    return res.status(200).json({ subgroups: subgroups.map((s) => ({ id: String(s._id), title: s.title, image: s.image })) });
  } catch (error) {
    console.error("Get category subgroups error:", error);

    return res.status(500).json({
      message: "Unable to retrieve subgroups",
    });
  }
};

// Most listing titles follow a "<Brand> Accounts | details..." convention,
// where the description after the first "|" often namedrops OTHER brands as
// compatibility notes (e.g. an AOL listing mentioning "(Hotmail/Outlook)"
// verified-by info) — matching the full title would misfile it under the
// wrong brand. So the primary segment is checked first; the full title is
// only a fallback for listings that don't follow that convention at all.
const listingMatchesKeywordsIn = (text, keywords) => keywords.some((kw) => text.includes(kw.toLowerCase()));

const findMatchingSubgroup = (listing, subgroups) => {
  const primary = (listing.title.split("|")[0] || "").toLowerCase();
  const byPrimary = subgroups.find((sg) => listingMatchesKeywordsIn(primary, sg.keywords));
  if (byPrimary) return byPrimary;

  const full = `${listing.title} ${listing.category?.title || ""}`.toLowerCase();
  return subgroups.find((sg) => listingMatchesKeywordsIn(full, sg.keywords));
};

// Words too generic to identify a brand on their own (e.g. "Accounts" in
// "Facebook Accounts" shouldn't match every "...Accounts" listing).
const GENERIC_WORDS = new Set(["accounts", "account", "sites", "site", "services", "service", "mails", "mail", "leads", "media", "premium", "and", "email", "emails"]);

const coreWord = (title) => {
  const words = (title || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  return words.find((w) => !GENERIC_WORDS.has(w) && w.length >= 3) || words[0] || "";
};

// Resolved once, at purchase time, and stored on the LogOrder — a subgroup's
// own brand logo (e.g. the Outlook favicon) is preferred since it's the most
// specific; only a handful of subgroups exist today so a global scan across
// all of them (regardless of which category owns each one) is cheap. Falls
// back to the top-level category's own image, matched by brand name the
// same way the customer-facing search results resolve an icon.
const resolveOrderImage = async (listing) => {
  const allSubgroups = await LogSubgroup.find();
  const subgroupMatch = findMatchingSubgroup(listing, allSubgroups);
  if (subgroupMatch?.image) return subgroupMatch.image;

  const categories = await LogCategory.find({ isEnabled: true });
  const haystack = (listing.category?.title || "").toLowerCase();
  const match = categories.find((c) => {
    const core = coreWord(c.title);
    return core.length >= 3 && haystack.includes(core);
  });
  return match?.image || null;
};

const getListings = async (req, res) => {
  try {
    const { category_id, subcategory_id, subgroup_id, search, per_page, page } = req.query;

    if (category_id) {
      const category = await LogCategory.findOne({ categoryId: Number(category_id), isEnabled: true });
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
    }

    const markup = await getLogsMarkup();
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limit = Math.max(1, parseInt(per_page) || 20);

    let listings;
    let meta;

    if (category_id && !search) {
      // Cheapest-first within a category — YoungPG's own sort/direction
      // params are documented but silently ignored, so the full category
      // is fetched once (cached) and sorted here instead.
      const allSorted = await listingsCache.getSortedCategoryListings(category_id, subcategory_id);
      let filtered = allSorted;

      if (subgroup_id) {
        // A listing can match more than one subgroup's keywords (e.g. a
        // title containing both "hotmail" and "mail.com") — so it's
        // assigned to the first match by `order`, never more than one,
        // keeping subgroups mutually exclusive like the name implies.
        const subgroups = await LogSubgroup.find({ categoryId: Number(category_id) }).sort({ order: 1, title: 1 });

        filtered =
          subgroup_id === "other"
            ? allSorted.filter((listing) => !findMatchingSubgroup(listing, subgroups))
            : allSorted.filter((listing) => String(findMatchingSubgroup(listing, subgroups)?._id) === String(subgroup_id));
      }

      const start = (pageNum - 1) * limit;

      listings = filtered.slice(start, start + limit);
      meta = { current_page: pageNum, last_page: Math.max(1, Math.ceil(filtered.length / limit)), per_page: limit, total: filtered.length };
    } else if (search) {
      // A broad search term can match 1000+ listings catalog-wide, so only
      // the requested page is fetched — sorted on its own rather than
      // globally, to avoid an unbounded number of calls to YoungPG.
      const result = await listingsCache.getListingsWithRetry({ category_id, subcategory_id, search, per_page: limit, page: pageNum });
      listings = [...result.data].sort((a, b) => Number(a.price_ngn) - Number(b.price_ngn));
      meta = result.meta;
    } else {
      const result = await listingsCache.getListingsWithRetry({ per_page: limit, page: pageNum });
      listings = result.data;
      meta = result.meta;
    }

    const priced = listings.map((listing) => ({
      ...listing,
      price_ngn: toCustomerPrice(listing.price_ngn, markup),
    }));

    return res.status(200).json({ listings: priced, meta });
  } catch (error) {
    console.error("Get listings error:", error.response?.data || error.message);

    return res.status(500).json({
      message: "Unable to retrieve listings",
    });
  }
};

const getListing = async (req, res) => {
  try {
    const { slug } = req.params;

    const markup = await getLogsMarkup();
    const listing = await youngpgService.getListing(slug);

    return res.status(200).json({
      listing: { ...listing, price_ngn: toCustomerPrice(listing.price_ngn, markup) },
    });
  } catch (error) {
    console.error("Get listing error:", error.response?.data || error.message);

    return res.status(404).json({
      message: "Listing not found",
    });
  }
};

// Looks for an order that just landed on YoungPG's side after our own
// request to them failed ambiguously (timeout/network error/502) — their
// purchase endpoint is explicitly not retry-safe, and there's no
// client-supplied idempotency key, so this is a best-effort recovery: the
// most recent order, within a tight time window, matching the listing title
// and amount we attempted. Good enough for a single reseller account at
// this scale; not a guarantee under heavy concurrent load.
const findRecentMatchingOrder = async (listingTitle, expectedYoungpgPrice) => {
  try {
    const { data: orders } = await youngpgService.getOrders({ per_page: 3, order: "id", reverse: true });
    const cutoff = Date.now() - 60 * 1000;

    return orders.find((order) => {
      const createdAt = new Date(order.created_at.replace(" ", "T") + "Z").getTime();
      return (
        createdAt >= cutoff &&
        order.listing === listingTitle &&
        Number(order.amount_ngn) === Number(expectedYoungpgPrice)
      );
    });
  } catch {
    return null;
  }
};

const purchase = async (req, res) => {
  try {
    const { slug } = req.body;

    if (!slug) {
      return res.status(400).json({
        message: "Listing is required",
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const userId = req.user.id;

    const markup = await getLogsMarkup();
    const listing = await youngpgService.getListing(slug);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (Number(listing.available_stock) <= 0) {
      return res.status(400).json({ message: "This listing is out of stock" });
    }

    const customerPrice = toCustomerPrice(listing.price_ngn, markup);
    const reference = `ML-LOG-${userId}-${Date.now()}`;

    // Debit first (atomic — enforces balance/frozen checks on its own), same
    // pattern as the SMS flow, refunded below if the YoungPG call fails.
    await debitWallet(userId, customerPrice, reference, {
      service: "youngpg_log",
      slug,
      listingTitle: listing.title,
      categoryTitle: listing.category?.title,
      customerPrice,
      youngpgPriceNGN: listing.price_ngn,
    });

    const refund = async (meta) => {
      await creditWallet({
        userId,
        amount: customerPrice,
        reference: `${reference}-REFUND`,
        source: "SYSTEM",
        meta: { service: "youngpg_log_refund", originalReference: reference, slug, listingTitle: listing.title, categoryTitle: listing.category?.title, ...meta },
      });
      await TransactionModel.updateOne({ reference }, { $set: { status: "failed" } });
    };

    let youngpgOrder;

    try {
      youngpgOrder = await youngpgService.purchase(slug, 1);
    } catch (error) {
      const status = error.response?.status;
      const isAmbiguous = !status || status >= 500 || error.code === "ECONNABORTED";

      if (isAmbiguous) {
        const matched = await findRecentMatchingOrder(listing.title, listing.price_ngn);

        if (matched) {
          // It actually went through — fetch the full detail (accounts) and
          // proceed as a success instead of refunding a real purchase.
          youngpgOrder = await youngpgService.getOrder(matched.id);
        } else {
          await refund({ reason: "purchase_timeout_unconfirmed" });
          return res.status(502).json({
            message: "Unable to confirm this purchase. You have been refunded — please try again.",
          });
        }
      } else {
        await refund({ reason: "purchase_failed", providerMessage: error.response?.data?.message });
        return res.status(400).json({
          message: error.response?.data?.message || "Unable to complete this purchase",
        });
      }
    }

    // YoungPG's own order id — for internal/support lookups only, never
    // shown to the customer (the customer-facing order id is our own
    // document's `_id`, set below). The POST /purchase response doesn't
    // reliably include the same `id` field the read endpoints do (observed
    // live: `accounts` came through fine but `id` was undefined), so this
    // falls back to `reference`, then to the same recent-order lookup used
    // for ambiguous-failure recovery — but a miss here must never block
    // saving a purchase whose credentials already came through.
    let providerOrderId = youngpgOrder.id != null ? String(youngpgOrder.id) : youngpgOrder.reference || null;

    if (!providerOrderId) {
      const matched = await findRecentMatchingOrder(listing.title, listing.price_ngn);
      providerOrderId = matched ? String(matched.id) : null;
    }

    if (providerOrderId) {
      await TransactionModel.updateOne({ reference }, { $set: { "meta.providerOrderId": providerOrderId } });
    } else {
      console.error("Log purchase: unable to determine YoungPG's own order id (credentials still saved)", youngpgOrder);
    }

    const image = await resolveOrderImage(listing);

    const logOrder = await LogOrder.create({
      user: userId,
      providerOrderId,
      slug,
      listingTitle: listing.title,
      categoryTitle: listing.category?.title,
      image,
      quantity: 1,
      amount: customerPrice,
      credentials: (youngpgOrder.accounts || []).map((account) => encrypt(account)),
      status: "completed",
    });

    return res.status(200).json({
      message: "Purchase successful",
      orderId: String(logOrder._id),
      amount: customerPrice,
    });
  } catch (error) {
    console.error("Log purchase error:", error.response?.data || error.message);

    return res.status(500).json({
      message: error.message || "Unable to complete this purchase",
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      LogOrder.find({ user: req.user.id })
        .select("-credentials -providerOrderId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LogOrder.countDocuments({ user: req.user.id }),
    ]);

    // Customer-facing order id is our own `_id`, never YoungPG's.
    const data = orders.map((o) => ({ ...o.toObject(), orderId: String(o._id) }));

    return res.status(200).json({
      data,
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
    console.error("Get my log orders error:", error);

    return res.status(500).json({
      message: "Unable to retrieve order history",
    });
  }
};

const getOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = await LogOrder.findOne({ _id: orderId, user: req.user.id });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      order: {
        orderId: String(order._id),
        slug: order.slug,
        listingTitle: order.listingTitle,
        categoryTitle: order.categoryTitle,
        image: order.image,
        quantity: order.quantity,
        amount: order.amount,
        status: order.status,
        createdAt: order.createdAt,
        credentials: order.credentials.map((c) => decrypt(c)),
      },
    });
  } catch (error) {
    console.error("Get log order error:", error);

    return res.status(500).json({
      message: "Unable to retrieve order",
    });
  }
};

module.exports = {
  getCategories,
  getGroups,
  getCategorySubgroups,
  getListings,
  getListing,
  purchase,
  getMyOrders,
  getOrder,
};
