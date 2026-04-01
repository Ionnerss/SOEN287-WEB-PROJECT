import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./src/routes/authRoutes.js";

const app = express();
const PORT = Number(process.env.PORT || 5500);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://127.0.0.1:5500";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});