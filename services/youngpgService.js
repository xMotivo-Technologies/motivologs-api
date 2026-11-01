const client = require("../config/youngpg");

async function getBalance() {
  const response = await client.get("/user/balance");
  return response.data.data;
}

async function getCategories() {
  const response = await client.get("/categories");
  return response.data.data;
}

async function getListings(params) {
  const response = await client.get("/listings", { params });
  return response.data;
}

async function getListing(slug) {
  const response = await client.get(`/listings/${slug}`);
  return response.data.data;
}

async function purchase(slug, quantity) {
  const response = await client.post("/purchase", { slug, quantity });
  return response.data.data;
}

async function getOrders(params) {
  const response = await client.get("/orders", { params });
  return response.data;
}

async function getOrder(orderId) {
  const response = await client.get(`/orders/${orderId}`);
  return response.data.data;
}

module.exports = {
  getBalance,
  getCategories,
  getListings,
  getListing,
  purchase,
  getOrders,
  getOrder,
};
