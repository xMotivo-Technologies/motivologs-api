const client = require("../config/fivesim");
require("dotenv").config();

// The 5sim operator used for every quote/purchase, editable in Render
// without a code change. Defaults to "virtual8" if unset — 5sim's operator
// names are case-sensitive lowercase; "Virtual8" 400s.
const DEFAULT_OPERATOR = process.env.MOTIVOLOGS_FIVESIM_OPERATOR || "virtual8";

// admin - change later to only allow admin users to access this service
async function getUserProfile() {
  const response = await client.get("/user/profile");

  return response.data; 
}

async function getCountries() {
  const response = await client.get("/guest/countries");

  return response.data;
}

// Shared USD -> customer NGN price conversion, used by both getProducts and
// getOperatorPrices so a service's "from" price and its per-operator prices
// are always computed the exact same way.
function toCustomerPriceNGN(priceUSD, flatMarkup) {
  const exchangeRate = Number(process.env.MOTIVOLOGS_USD_NGN_RATE);
  if (!exchangeRate || exchangeRate <= 0) {
    throw new Error("Invalid USD to NGN exchange rate");
  }

  const resolvedMarkup = flatMarkup != null ? Number(flatMarkup) : Number(process.env.MOTIVOLOGS_FLAT_MARKUP ?? 800);
  const priceNGN = Number(priceUSD) * exchangeRate + resolvedMarkup;

  // Round to the nearest ₦100 (e.g. 2365 -> 2400).
  return Math.round(priceNGN / 100) * 100;
}

// `flatMarkup` is optional — pass the admin-configured value from the
// caller (which checks the database first) when you have it. Falls back to
// the env var here so this still works standalone (e.g. direct scripts).
async function getProducts(country, operator = DEFAULT_OPERATOR, flatMarkup) {
  const response = await client.get(
    `/guest/products/${country}/${operator}`
  );

  const products = response.data;

  for (const product of Object.values(products)) {
    product.cost = toCustomerPriceNGN(product.Price, flatMarkup);
    product.currency = "NGN";
  }

  return products;
}

// Every operator available for one service in one country, each with its
// own price/stock/delivery-rate — lets a customer pick exactly which
// operator's number to buy instead of the backend choosing for them.
async function getOperatorPrices(country, product, flatMarkup) {
  const response = await client.get("/guest/prices", {
    params: { country, product },
  });

  const byOperator = response.data?.[country]?.[product] || {};

  return Object.entries(byOperator).map(([operator, info]) => ({
    operator,
    cost: toCustomerPriceNGN(info.cost, flatMarkup),
    count: info.count,
    rate: info.rate,
    currency: "NGN",
  }));
}

async function buyActivationNumber(
  country,
  product,
  operator = DEFAULT_OPERATOR
) {
  const response = await client.get(
    `/user/buy/activation/${country}/${operator}/${product}`
  );

  return response.data;
}

async function buyHostingNumber(
  country,
  product,
  operator = DEFAULT_OPERATOR
) {
  const response = await client.get(
    `/user/buy/hosting/${country}/${operator}/${product}`
  );

  return response.data;
}

async function checkOrder(orderId) {
  const response = await client.get(
    `/user/check/${orderId}`
  );

  return response.data;
}

async function finishOrder(orderId) {
  const response = await client.get(
    `/user/finish/${orderId}`
  );

  return response.data;
}

async function cancelOrder(orderId) {
  const response = await client.get(
    `/user/cancel/${orderId}`
  );

  return response.data;
}

async function banOrder(orderId) {
  const response = await client.get(
    `/user/ban/${orderId}`
  );

  return response.data;
}

async function getSmsInbox(orderId) {
  const response = await client.get(
    `/user/sms/inbox/${orderId}`
  );

  return response.data;
}

async function getBalance() {
  const response = await client.get("/user/profile");

  return response.data;
}

async function checkOrder(orderId) {
  const response = await client.get(`/user/check/${orderId}`);

  return response.data;
}



module.exports = {
  getUserProfile,
  getCountries,
  getProducts,
  getOperatorPrices,
  buyActivationNumber,
  buyHostingNumber,
  checkOrder,
  finishOrder,
  cancelOrder,
  banOrder,
  getSmsInbox,
  getBalance,
};