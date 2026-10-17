const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const envPath = fs.existsSync(path.join(__dirname, ".env"))
  ? path.join(__dirname, ".env")
  : path.join(__dirname, ".env.dev");
require("dotenv").config({ path: envPath });
const { parse } = require("pg-connection-string");

async function checkDatabase() {
  console.log("==================================================");
  console.log("🔍 PULZION '26 EC2 POSTGRESQL VERIFICATION");
  console.log("==================================================");

  let parsed = {};
  if (process.env.DATABASE_URL) {
    try {
      parsed = parse(process.env.DATABASE_URL);
    } catch (_) {}
  }
  
  const testHost = process.env.DB_HOST || (parsed.host === "host.docker.internal" ? "127.0.0.1" : parsed.host) || "127.0.0.1";
  const testPort = parseInt(process.env.DB_PORT || parsed.port || 5433, 10);
  const testUser = process.env.DB_USER || parsed.user || "postgres";
  const testPassword = process.env.DB_PASSWORD || parsed.password;
  const testDatabase = process.env.DB_NAME || parsed.database || "PulzionSubmission";
  const isSSL =
    process.env.DATABASE_URL?.includes("sslmode=require") ||
    process.env.DATABASE_SSL === "true";

  console.log(`Connecting to host: ${testHost}:${testPort}, database: ${testDatabase}, user: ${testUser}`);

  const client = new Client({
    host: testHost,
    port: testPort,
    user: testUser,
    password: testPassword,
    database: testDatabase,
    ssl: isSSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log(" Connected to PostgreSQL database successfully!");

    const resNow = await client.query("SELECT NOW()");
    console.log(` Database server time: ${resNow.rows[0].now}`);

    const resTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tables = resTables.rows.map(r => r.table_name);
    console.log(`\n📋 Found ${tables.length} table(s) in schema 'public':`);
    if (tables.length === 0) {
      console.log("   ⚠️  No tables found in database 'PulzionSubmission' yet.");
      console.log("   👉 Run: 'node db/init_full_schema.js' to create tables and seed events.");
    } else {
      for (const t of tables) {
        try {
          const countRes = await client.query(`SELECT COUNT(*) FROM "${t}"`);
          console.log(`   - ${t} (${countRes.rows[0].count} rows)`);
        } catch (_) {
          console.log(`   - ${t}`);
        }
      }
      console.log("\n Database is ready for Submission26 backend!");
    }

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Connection error:", err.message);
    if (err.code === "ECONNREFUSED") {
      console.error("\n💡 Hint: Connection refused on port " + testPort + ".");
      console.error("   Ensure your SSH tunnel is running on your Mac:");
      console.error("   ssh -i /path/to/your-key.pem -N -L 0.0.0.0:5433:127.0.0.1:5432 <ssh_user>@<ec2_ip>\n");
    }
    process.exit(1);
  }
}

checkDatabase();
