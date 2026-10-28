const axios = require("axios");

const fivesimApi = axios.create({
  baseURL: "https://5sim.net/v1",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${process.env.FIVESIM_API_TOKEN}`,
  },
});

// Safety net — 5sim's own docs don't list 401 as a possible response for
// any of the endpoints we actually use (buy/check/finish/cancel all only
// document 200/400/404/500), so a 401 is never a legitimate "no" from
// them. Worth one retry before giving up.
fivesimApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (error.response?.status === 401 && config && !config._retried401) {
      config._retried401 = true;
      return fivesimApi(config);
    }

    return Promise.reject(error);
  }
);

module.exports = fivesimApi;
