const UserModel = require("../../models/User");

const SAFE_FIELDS = "-password -refreshToken -resetPasswordToken -resetPasswordExpires";

const getProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id).select(SAFE_FIELDS);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    let { firstName, lastName, phoneNumber } = req.body;

    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({
        message: "First name, last name, and phone number are required",
      });
    }

    firstName = firstName.trim();
    lastName = lastName.trim();
    phoneNumber = phoneNumber.trim();

    const existingPhone = await UserModel.findOne({
      phoneNumber,
      _id: { $ne: req.user.id },
    }).lean();

    if (existingPhone) {
      return res.status(409).json({
        message: "Phone number already in use",
      });
    }

    const user = await UserModel.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, phoneNumber },
      { new: true, runValidators: true },
    ).select(SAFE_FIELDS);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = { getProfile, updateProfile };
