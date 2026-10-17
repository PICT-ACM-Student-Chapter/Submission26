const { Client } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env.dev") });
const { parse } = require("pg-connection-string");

async function checkDatabase() {
  console.log("==================================================");
  console.log("🔍 PULZION '26 EC2 POSTGRESQL VERIFICATION");
  console.log("==================================================");

  const parsed = parse(process.env.DATABASE_URL);
  
  // For running directly on the Mac host, if host is host.docker.internal, map to 127.0.0.1
  const testHost = parsed.host === "host.docker.internal" ? "127.0.0.1" : parsed.host;
  const testPort = parsed.port || 5433;

  console.log(`Connecting to host: ${testHost}:${testPort}, database: ${parsed.database}, user: ${parsed.user}`);

  const client = new Client({
    host: testHost,
    port: testPort,
    user: parsed.user,
    password: parsed.password,
    database: parsed.database,
    ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : false,
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
