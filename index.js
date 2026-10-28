// Must run before any other require — several modules (config/fivesim.js
// in particular) read process.env at require-time to build long-lived
// clients, so env vars have to exist before anything else is pulled in.
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/dbConfig");
const { startOrderSweep } = require("./jobs/orderSweep");

const app = express();

// DB
connectDB();
startOrderSweep();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://motivologs.com",
      "https://www.motivologs.com",
    ],
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api", require("./routes/auth/AuthRoute"));
app.use("/api", require("./routes/fivesim/fivesimRoutes"));
app.use("/api", require("./routes/wallet/virtualAccountRoute"));
app.use("/api", require("./routes/wallet/walletRoute"));
app.use("/api", require("./routes/wallet/transactionRoute"));
app.use("/api", require("./routes/wallet/webhookRoute"));
app.use("/api", require("./routes/admin/AdminAuthRoute"));
app.use("/api", require("./routes/admin/AdminRoute"));
app.use("/api", require("./routes/announcement/AnnouncementRoute"));


// Test route
app.get("/", (req, res) => {
  res.json({
    message: "Server is working",
  });
});

// Run server
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
