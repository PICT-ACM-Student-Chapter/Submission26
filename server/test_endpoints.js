const client = require("./db/connect");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "./.env.dev" });

async function testAll() {
  console.log("==================================================");
  console.log("🧪 TESTING 4 EVENT SUBMISSIONS ON NEON DB");
  console.log("==================================================\n");

  try {
    // 1. Create or retrieve test user
    const testEmail = "test_participant@pulzion.co.in";
    let userResult = await client.query("SELECT * FROM users WHERE email = $1", [testEmail]);
    let userId;

    if (userResult.rowCount === 0) {
      const insertUser = await client.query(
        `INSERT INTO users (first_name, last_name, email, mobile_number, college, year, ems_id, created_at, updated_at)
         VALUES ('Test', 'Participant', $1, '9999988888', 'PICT Pune', 'TE', 9999, NOW(), NOW())
         RETURNING *`,
        [testEmail]
      );
      userId = insertUser.rows[0].id;
      console.log(`✓ Created test user (ID: ${userId})`);
    } else {
      userId = userResult.rows[0].id;
      console.log(`✓ Using existing test user (ID: ${userId})`);
    }

    // 2. Generate test JWT (1 day expiry)
    const token = jwt.sign(
      { id: userId },
      process.env.TOKEN_SECRET || "f3045686f75f6063e3fa79be41",
      { expiresIn: "1d" }
    );
    await client.query("DELETE FROM user_token WHERE fk_user = $1", [userId]);
    await client.query(
      "INSERT INTO user_token (token, is_valid, ems_token, fk_user, created_at, updated_at) VALUES ($1, true, 'mock_ems_token', $2, NOW(), NOW())",
      [token, userId]
    );
    console.log(`✓ Generated JWT token: ${token.substring(0, 20)}...`);

    // 3. Register user for all 4 events (10, 12, 20, 21)
    const eventIds = [10, 12, 20, 21];
    for (const eid of eventIds) {
      await client.query(
        "INSERT INTO user_events (fk_user, fk_event, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT DO NOTHING",
        [userId, eid]
      );
    }
    console.log(`✓ Registered test user for events: [Freeze: 10, Innowave: 12, HackNova: 20, Root Cause: 21]\n`);

    // 4. Test Freeze The Second (URL submission)
    await client.query("DELETE FROM freeze_submission WHERE fk_user = $1", [userId]);
    const freezeRes = await client.query(
      `INSERT INTO freeze_submission (submission, photo_title, camera_device, description, active_submission, fk_user, created_at, updated_at)
       VALUES ('https://images.unsplash.com/photo-campus.jpg', 'Campus Monolith', 'Sony A7 IV', 'Sunset perspective', true, $1, NOW(), NOW())
       RETURNING *`,
      [userId]
    );
    console.log("📷 Freeze The Second Test:");
    console.log(`   Status: SUCCESS | Photo URL: ${freezeRes.rows[0].submission} | Title: "${freezeRes.rows[0].photo_title}"`);

    // 5. Test Innowave
    await client.query("DELETE FROM innowave WHERE fk_user = $1", [userId]);
    const innoRes = await client.query(
      `INSERT INTO innowave (Innowave_type, submission, video_pitch_url, team_name, active_submission, fk_user, created_at, updated_at)
       VALUES ('Future Tech', 'https://drive.google.com/file/d/innowave_deck.pdf', 'https://youtu.be/pitch_demo', 'Quantum Leap', true, $1, NOW(), NOW())
       RETURNING *`,
      [userId]
    );
    console.log("\n💡 Innowave Test:");
    console.log(`   Status: SUCCESS | Track: ${innoRes.rows[0].innowave_type} | Deck URL: ${innoRes.rows[0].submission}`);

    // 6. Test HackNova
    await client.query("DELETE FROM hacknova WHERE fk_user = $1", [userId]);
    const hackRes = await client.query(
      `INSERT INTO hacknova (team_name, project_title, github_url, live_demo_url, notes, active_submission, fk_user, created_at, updated_at)
       VALUES ('CyberSquad', 'Autonomous Campus Bot', 'https://github.com/pict/hacknova-project', 'https://hacknova-bot.vercel.app', 'Full stack React + Node prototype', true, $1, NOW(), NOW())
       RETURNING *`,
      [userId]
    );
    console.log("\n⚡ HackNova Test:");
    console.log(`   Status: SUCCESS | Title: "${hackRes.rows[0].project_title}" | Repo: ${hackRes.rows[0].github_url}`);

    // 7. Test Root Cause
    await client.query("DELETE FROM rootcause WHERE fk_user = $1", [userId]);
    const rootRes = await client.query(
      `INSERT INTO rootcause (team_name, github_pr_url, notes, active_submission, fk_user, created_at, updated_at)
       VALUES ('DebugMasters', 'https://github.com/pict-oss/bugathon/pull/101', 'Fixed race condition in connection pool retry loop', true, $1, NOW(), NOW())
       RETURNING *`,
      [userId]
    );
    console.log("\n🐛 Root Cause Test:");
    console.log(`   Status: SUCCESS | PR Link: ${rootRes.rows[0].github_pr_url} | Notes: "${rootRes.rows[0].notes}"`);

    console.log("\n==================================================");
    console.log("🎉 ALL 4 EVENT SUBMISSIONS PASSED ON NEON DB!");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testAll();
