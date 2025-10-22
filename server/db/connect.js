const { Pool } = require("pg");

// Neon DB configuration - works for both dev and production
const neonConfig = {
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_x9Cekbpz3VdE@ep-winter-butterfly-aej1wis2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require",
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
};

console.log("Connecting to Neon DB...");

const pool = new Pool(neonConfig);

pool.on('connect', () => {
  console.log('Connected to Neon DB');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
