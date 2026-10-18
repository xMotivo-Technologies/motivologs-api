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

// `flatMarkup` is optional — pass the admin-configured value from the
// caller (which checks the database first) when you have it. Falls back to
// the env var here so this still works standalone (e.g. direct scripts).
async function getProducts(country, operator = DEFAULT_OPERATOR, flatMarkup) {
  const response = await client.get(
    `/guest/products/${country}/${operator}`
  );

  const exchangeRate = Number(
    process.env.MOTIVOLOGS_USD_NGN_RATE
  );

  const resolvedMarkup = flatMarkup != null ? Number(flatMarkup) : Number(process.env.MOTIVOLOGS_FLAT_MARKUP ?? 800);

  if (!exchangeRate || exchangeRate <= 0) {
    throw new Error("Invalid USD to NGN exchange rate");
  }

  const products = response.data;

  for (const product of Object.values(products)) {
    const priceUSD = Number(product.Price);

    const priceNGN = priceUSD * exchangeRate;

    const customerPrice = priceNGN + resolvedMarkup;

    // Round to the nearest ₦100 (e.g. 2365 -> 2400).
    product.cost = Math.round(customerPrice / 100) * 100;
    product.currency = "NGN";
  }

  return products;
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
  buyActivationNumber,
  buyHostingNumber,
  checkOrder,
  finishOrder,
  cancelOrder,
  banOrder,
  getSmsInbox,
  getBalance,
};