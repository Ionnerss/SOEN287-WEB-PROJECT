import express from "express";
import cors from "cors";
import testRoutes from "./routes/test.js";
import coursesRoutes from "./routes/courses.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", testRoutes);
app.use("/api/courses", coursesRoutes);

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});