const express = require('express');
const { register } = require('../../controllers/auth/RegisterController');
const { login } = require('../../controllers/auth/LoginController');
const { forgotPassword } = require('../../controllers/auth/forgotPassword');
const { resetPassword } = require('../../controllers/auth/ResetPassword');
const { refreshAccessToken } = require('../../controllers/auth/RefreshTokenController');
const { logout } = require('../../controllers/auth/LogoutController');
const { getProfile, updateProfile } = require('../../controllers/auth/ProfileController');
const authToken = require('../../middleware/auth');
const maintenanceGate = require('../../middleware/maintenanceGate');
const router = express.Router()

// Pre-login / account-lifecycle actions — never gated by maintenance mode,
// so the homepage/login/register/reset-password flow always works.
router.post('/signup', register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);

// Everything below requires being logged in already — Profile is a
// protected page, so it's gated like the rest of the authenticated app.
router.use(maintenanceGate);

router.get("/me", authToken, getProfile);
router.patch("/me", authToken, updateProfile);

module.exports = router
