import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path"; // 1. Added this
import { fileURLToPath } from "url"; // 2. Added this

// 3. Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from "./src/routes/authRoutes.js";
import usersRoutes from "./src/routes/usersRoutes.js";
import coursesRoutes from "./src/routes/courses.js";
import assessmentsRoutes from "./src/routes/assessments.js";


const app = express();
const PORT = Number(process.env.PORT || 3000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://127.0.0.1:5500";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());

// This will now work because path and __dirname are defined above
app.use(express.static(path.join(__dirname, "../client")));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/assessments", assessmentsRoutes);


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 

