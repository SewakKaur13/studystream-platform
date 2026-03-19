const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const loginUser = async (req, res) => {
  try {
    const { enrollmentNumber, password } = req.body;

    const user = await User.findOne({ enrollmentNumber });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "9h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 9 * 60 * 60 * 1000
    });

    res.json({
      name: user.name,
      enrollmentNumber: user.enrollmentNumber,
      role: user.role
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const logoutUser = (req, res) => {
  try {

    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    });

    res.json({
      message: "Logout successful"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { loginUser, logoutUser };