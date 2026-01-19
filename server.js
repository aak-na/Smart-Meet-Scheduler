// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const { sendClientMail } = require("./sendClientMailModule");

const app = express();
app.use(bodyParser.json({ limit: "1mb" }));

// connect mongo
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo connected"))
  .catch((err) => {
    console.error("Mongo connection error", err);
    process.exit(1);
  });

// routes
app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/api/schedule-meeting", async (req, res) => {
  await sendClientMail(req, res);
});

// list meetings (for simple verification)
app.get("/api/meetings", async (req, res) => {
  const Meeting = require("./models/Meeting");
  const items = await Meeting.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json(items);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
