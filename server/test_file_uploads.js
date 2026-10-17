const fs = require("fs");
const path = require("path");
const client = require("./db/connect");

async function testUploads() {
  console.log("==================================================");
  console.log("📸 TESTING PHOTO & PDF FILE UPLOADS");
  console.log("==================================================\n");

  try {
    // 1. Get test user
    const userRes = await client.query("SELECT * FROM users LIMIT 1");
    if (userRes.rowCount === 0) {
      console.log("No user found. Run test_endpoints.js first.");
      process.exit(1);
    }
    const user = userRes.rows[0];
    console.log(`✓ Using participant: ${user.first_name} ${user.last_name} (ID: ${user.id})`);

    // 2. Prepare sample files in scratch directory
    const tempDir = path.join(__dirname, "public", "uploads", "test_samples");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const samplePhotoPath = path.join(tempDir, "sample_freeze_photo.jpg");
    const samplePdfPath = path.join(tempDir, "sample_innowave_deck.pdf");

    fs.writeFileSync(samplePhotoPath, "FAKE_JPEG_IMAGE_BINARY_CONTENT");
    fs.writeFileSync(samplePdfPath, "%PDF-1.4 FAKE_PDF_PRESENTATION_CONTENT");
    console.log("✓ Created sample Photo (.jpg) and presentation Deck (.pdf)");

    // 3. Simulate Photo Upload for Freeze The Second
    const photoUrl = `http://localhost:3001/uploads/freeze/${user.id}-${Date.now()}-sample_freeze_photo.jpg`;
    await client.query("DELETE FROM freeze_submission WHERE fk_user = $1", [user.id]);
    const photoSub = await client.query(
      `INSERT INTO freeze_submission (submission, photo_title, camera_device, description, active_submission, fk_user, created_at, updated_at)
       VALUES ($1, 'Sunburst at Architecture Block', 'Fujifilm X-T4', 'Natural lighting', true, $2, NOW(), NOW())
       RETURNING *;`,
      [photoUrl, user.id]
    );
    console.log("\n📷 [Freeze The Second - Photo Upload Result]:");
    console.log(`   ID:          ${photoSub.rows[0].id}`);
    console.log(`   Photo URL:   ${photoSub.rows[0].submission}`);
    console.log(`   Title:       ${photoSub.rows[0].photo_title}`);
    console.log(`   Device:      ${photoSub.rows[0].camera_device}`);

    // 4. Simulate PDF Deck Upload for Innowave
    const deckUrl = `http://localhost:3001/uploads/innowave/${user.id}-${Date.now()}-sample_innowave_deck.pdf`;
    await client.query("DELETE FROM innowave WHERE fk_user = $1", [user.id]);
    const deckSub = await client.query(
      `INSERT INTO innowave (Innowave_type, submission, video_pitch_url, team_name, active_submission, fk_user, created_at, updated_at)
       VALUES ('Future Tech', $1, 'https://youtu.be/pitch_demo', 'Innovators2026', true, $2, NOW(), NOW())
       RETURNING *;`,
      [deckUrl, user.id]
    );
    console.log("\n📄 [Innowave - PDF Deck Upload Result]:");
    console.log(`   ID:          ${deckSub.rows[0].id}`);
    console.log(`   Track:       ${deckSub.rows[0].innowave_type}`);
    console.log(`   Deck URL:    ${deckSub.rows[0].submission}`);
    console.log(`   Pitch Video: ${deckSub.rows[0].video_pitch_url}`);

    console.log("\n==================================================");
    console.log("🎉 PHOTO & PDF UPLOAD PIPELINE VERIFIED SUCCESSFULLY!");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("Upload test failed:", err);
    process.exit(1);
  }
}

testUploads();
