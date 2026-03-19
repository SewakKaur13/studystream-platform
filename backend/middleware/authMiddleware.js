const jwt = require("jsonwebtoken");

const verifyUser = (req, res, next) => {
  try {

    let token = null;

    // 1. token from cookies
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 2. token from header
    if (!token && req.headers.authorization) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized: Token missing"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.id;
    req.role = decoded.role;

    next();

  } catch (error) {
    res.status(401).json({
      message: "Unauthorized: Invalid token"
    });
  }
};

module.exports = verifyUser;