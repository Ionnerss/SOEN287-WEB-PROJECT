import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "DevPassword123!",        // or your MySQL password
  database: "soen287", // make sure this DB exists
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default db;