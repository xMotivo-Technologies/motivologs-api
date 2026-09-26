const express = require("express");
const { register, login } = require("../../controllers/admin/AdminAuthController");
const router = express.Router();

// TEMPORARY — remove the register route once your admin account(s) exist.
router.post("/admin/register", register);
router.post("/admin/login", login);

module.exports = router;
