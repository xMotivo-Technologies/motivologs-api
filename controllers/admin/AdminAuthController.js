const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const AdminModel = require("../../models/Admin");

// Temporary self-serve registration — remove this route once your admin
// account(s) exist.
const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    name = name.trim();
    email = email.trim().toLowerCase();

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const existing = await AdminModel.findOne({ email });

    if (existing) {
      return res.status(409).json({
        message: "An admin with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await AdminModel.create({
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Admin registered successfully",
      adminId: admin._id,
    });
  } catch (error) {
    console.error("Admin register error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const admin = await AdminModel.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!admin) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const accessToken = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: "12h" },
    );

    return res.status(200).json({
      message: "Login successful",
      admin: { id: admin._id, name: admin.name, email: admin.email },
      accessToken,
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = { register, login };
