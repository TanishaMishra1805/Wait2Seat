require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");
const apiRoutes = require("./routes/api");
const { trainChatbot } = require("./services/chatbot");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/api", apiRoutes);

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  await trainChatbot(); // warm up NLP.js model on boot
  app.listen(PORT, () => console.log(`🚆 Wait2Seat server running on http://localhost:${PORT}`));
})();
