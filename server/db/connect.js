const { Pool } = require("pg");

const neonConfig = {
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_l1cmYf8SOdhq@ep-flat-credit-b4psyuwc-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
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
