const bcrypt = require("bcryptjs");
const client = require("./db/connect");

async function createAdmin() {
  const args = process.argv.slice(2);
  const username = args[0] || process.env.ADMIN_USERNAME;
  const password = args[1] || process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.log("Usage: npm run create-admin <username> <password>");
    console.log("Or set ADMIN_USERNAME and ADMIN_PASSWORD in environment.");
    process.exit(1);
  }

  console.log("==================================================");
  console.log("🛡️  PULZION '26 ADMIN ACCOUNT PROVISIONING");
  console.log("==================================================");

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if admin user already exists
    const checkQuery = "SELECT * FROM Admin WHERE username = $1";
    const checkResult = await client.query(checkQuery, [username]);

    let admin;
    if (checkResult.rowCount > 0) {
      // Update existing admin password
      const updateQuery = `
        UPDATE Admin 
        SET password = $1, updated_at = NOW() 
        WHERE username = $2 
        RETURNING id, username, created_at, updated_at;
      `;
      const updateRes = await client.query(updateQuery, [hashedPassword, username]);
      admin = updateRes.rows[0];
      console.log(`\n🔄 Updated existing admin account: "${username}"`);
    } else {
      // Create new admin
      const insertQuery = `
        INSERT INTO Admin (username, password, created_at, updated_at) 
        VALUES ($1, $2, NOW(), NOW()) 
        RETURNING id, username, created_at, updated_at;
      `;
      const insertRes = await client.query(insertQuery, [username, hashedPassword]);
      admin = insertRes.rows[0];
      console.log(`\n✅ Successfully created new admin account: "${username}"`);
    }

    console.log(`   Admin ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log("   Password: [SET SECURELY (HASHED WITH BCRYPT)]");
    console.log("--------------------------------------------------");
    console.log("🔑 HOW TO LOGIN AS ADMIN:");
    console.log("   Method: POST /admin/signin");
    console.log("   Body:   { \"username\": \"" + username + "\", \"password\": \"<your-password>\" }");
    console.log("   Returns: JWT token for Authorization: Bearer <token>");
    console.log("==================================================");

    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to create/update admin:", err);
    process.exit(1);
  }
}

createAdmin();
