const axios = require("axios");

const youngpgApi = axios.create({
  baseURL: "https://youngpgmedia.com.ng/api/v1",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Key": process.env.YOUNGPG_API_KEY,
  },
});

module.exports = youngpgApi;
