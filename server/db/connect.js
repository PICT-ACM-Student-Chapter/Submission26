const { Client } = require("pg");

// Neon DB configuration - works for both dev and production
const neonConfig = {
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_x9Cekbpz3VdE@ep-winter-butterfly-aej1wis2-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: {
    rejectUnauthorized: false,
  },
};

console.log("Connecting to Neon DB...");

const client = new Client(neonConfig); 

module.exports = client;