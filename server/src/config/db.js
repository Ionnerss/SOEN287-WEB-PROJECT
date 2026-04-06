import 'dotenv/config';
import mysql from 'mysql2/promise';


const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'DevPassword123!',
  database: process.env.DB_NAME || 'soen287',
});

// ADD THIS PART TO TEST THE CONNECTION: 
db.getConnection()
  .then(() => {
    console.log("✅ Connected to the MySQL database successfully!");
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });

export default db;