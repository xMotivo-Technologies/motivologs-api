const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const UserModel = require("../../models/User");

const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Refresh token is invalid or expired" });
    }

    const user = await UserModel.findById(decoded.id);

    if (!user || !user.refreshToken) {
      return res.status(401).json({ message: "Refresh token is invalid or expired" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    if (hashedToken !== user.refreshToken) {
      // Token doesn't match what we last issued — possible reuse/theft.
      // Invalidate the stored token so the compromised one can't be replayed.
      user.refreshToken = null;
      await user.save();
      return res.status(401).json({ message: "Refresh token is invalid or expired" });
    }

    const accessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "45m" },
    );

    // Rotate the refresh token on every use. Include a random jti so the
    // new token is never identical to the old one even if signed within
    // the same second (JWT timestamps are second-resolution).
    const newRefreshToken = jwt.sign(
      { id: user._id, jti: crypto.randomBytes(16).toString("hex") },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    user.refreshToken = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");
    await user.save();

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = { refreshAccessToken };
