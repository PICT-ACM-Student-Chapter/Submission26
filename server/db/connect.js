const { Pool } = require("pg");

const isSSL =
  process.env.DATABASE_URL?.includes("sslmode=require") ||
  process.env.DATABASE_SSL === "true";

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ...(isSSL ? { ssl: { rejectUnauthorized: false } } : {}),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
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

