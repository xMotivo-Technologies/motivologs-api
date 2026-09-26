const express = require('express');
const { register } = require('../../controllers/auth/RegisterController');
const { login } = require('../../controllers/auth/LoginController');
const { forgotPassword } = require('../../controllers/auth/forgotPassword');
const { resetPassword } = require('../../controllers/auth/ResetPassword');
const { refreshAccessToken } = require('../../controllers/auth/RefreshTokenController');
const { logout } = require('../../controllers/auth/LogoutController');
const { getProfile, updateProfile } = require('../../controllers/auth/ProfileController');
const authToken = require('../../middleware/auth');
const router = express.Router()


router.post('/signup', register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);
router.get("/me", authToken, getProfile);
router.patch("/me", authToken, updateProfile);

module.exports = router
