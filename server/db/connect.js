const { Pool } = require("pg");
const path = require("path");
const fs = require("fs");

// Ensure environment variables are loaded if connect.js is imported standalone
if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
  const envPath = fs.existsSync(path.join(__dirname, "../.env"))
    ? path.join(__dirname, "../.env")
    : path.join(__dirname, "../.env.dev");
  require("dotenv").config({ path: envPath });
}

const isSSL =
  process.env.DATABASE_URL?.includes("sslmode=require") ||
  process.env.DATABASE_SSL === "true";

// Build configuration: prioritize direct credentials (DB_HOST, etc.) if provided to prevent password URL-encoding issues,
// otherwise use connectionString from DATABASE_URL.
const dbConfig = process.env.DB_HOST
  ? {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || "PulzionSubmission",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
      ...(isSSL ? { ssl: { rejectUnauthorized: false } } : {}),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      connectionString: process.env.DATABASE_URL,
      ...(isSSL ? { ssl: { rejectUnauthorized: false } } : {}),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

console.log("Connecting to PostgreSQL database...");

const pool = new Pool(dbConfig);

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;

