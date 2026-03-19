const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");

const quizRoutes = require("./routes/quizRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");

dotenv.config();
connectDB();

const app = express();

/* CORS Configuration */
app.use(cors({
  origin: "https://studystream-platform.vercel.app/",
  credentials: true
}));

/* Middlewares */
app.use(express.json());
app.use(cookieParser());

/* Routes */
app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/student", studentRoutes);

/* Test Route */
app.get("/", (req, res) => {
  res.send("Quiz API running");
});

/* Server */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});