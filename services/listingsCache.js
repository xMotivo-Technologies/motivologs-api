const youngpgService = require("./youngpgService");

// YoungPG's `sort`/`direction` listing params are documented but silently
// ignored on their live API (confirmed by comparing identical output for a
// bogus sort value vs. "price") — so "cheapest first" has to be done here.
// A category tops out around 400 listings / 96 per page (their own per_page
// cap, confirmed live), so fetching every page for one category is bounded
// and cheap; cached per category so repeat views don't re-hit YoungPG.
const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PER_PAGE = 96;

const cache = new Map(); // `${categoryId}:${subcategoryId}` -> { listings, fetchedAt }

const buildKey = (categoryId, subcategoryId) => `${categoryId || ""}:${subcategoryId || ""}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRY_IN_REGEX = /retry in (\d+)s/i;
const MAX_RETRY_ATTEMPTS = 4;

// A full category fetch is several sequential calls, so it's the path most
// likely to trip YoungPG's own rate limit (confirmed live: a 429 with a
// "retry in Ns" message). Retries with the delay YoungPG itself asks for.
async function getListingsWithRetry(params, attempt = 1) {
  try {
    return await youngpgService.getListings(params);
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.message || "";
    const isRateLimited = status === 429 || /rate limit/i.test(message);

    if (!isRateLimited || attempt >= MAX_RETRY_ATTEMPTS) throw error;

    const match = message.match(RETRY_IN_REGEX);
    const waitMs = (match ? Number(match[1]) : 3 * attempt) * 1000 + 500;
    await sleep(waitMs);
    return getListingsWithRetry(params, attempt + 1);
  }
}

async function fetchAllSorted({ categoryId, subcategoryId, search } = {}) {
  let page = 1;
  let lastPage = 1;
  const all = [];

  do {
    const { data, meta } = await getListingsWithRetry({
      category_id: categoryId,
      subcategory_id: subcategoryId,
      search,
      per_page: MAX_PER_PAGE,
      page,
    });
    all.push(...data);
    lastPage = meta.last_page;
    page += 1;
  } while (page <= lastPage);

  all.sort((a, b) => Number(a.price_ngn) - Number(b.price_ngn));
  return all;
}

// Only safe to cache/full-fetch for a bounded category — a broad search term
// (e.g. a single letter) can match 1000+ listings catalog-wide, so callers
// should sort just the single returned page for search instead.
async function getSortedCategoryListings(categoryId, subcategoryId) {
  const key = buildKey(categoryId, subcategoryId);
  const cached = cache.get(key);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.listings;
  }

  const listings = await fetchAllSorted({ categoryId, subcategoryId });
  cache.set(key, { listings, fetchedAt: Date.now() });
  return listings;
}

module.exports = { getSortedCategoryListings, getListingsWithRetry };
