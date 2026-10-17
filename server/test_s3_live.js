require("dotenv").config({ path: "./.env.dev" });
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const client = require("./db/connect");

async function testLiveS3Upload() {
  console.log("==================================================");
  console.log("🚀 TESTING LIVE AWS S3 UPLOAD + NEON DB INTEGRATION");
  console.log("==================================================\n");

  const bucket = process.env.AWS_S3_BUCKET || "pulzion-submissions-bucket";
  const region = process.env.AWS_REGION || "ap-south-1";

  console.log(`Bucket: ${bucket}`);
  console.log(`Region: ${region}\n`);

  const s3 = new S3Client({
    region: region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  try {
    // 1. Upload sample photo directly to S3
    const photoKey = `submissions/freeze/1-${Date.now()}-live_test_photo.jpg`;
    console.log(`1. Uploading photo to AWS S3: '${photoKey}'...`);

    const fakeImageBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
      "base64"
    );

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: photoKey,
        Body: fakeImageBuffer,
        ContentType: "image/jpeg",
      })
    );

    const s3PhotoUrl = `https://${bucket}.s3.${region}.amazonaws.com/${photoKey}`;
    console.log("✓ S3 Upload SUCCESS!");
    console.log(`✓ S3 Photo URL: ${s3PhotoUrl}\n`);

    // 2. Upload sample PDF deck directly to S3
    const deckKey = `submissions/innowave/1-${Date.now()}-live_pitch_deck.pdf`;
    console.log(`2. Uploading PDF deck to AWS S3: '${deckKey}'...`);

    const fakePdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\nxref\n0 3\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n100\n%%EOF");

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: deckKey,
        Body: fakePdfBuffer,
        ContentType: "application/pdf",
      })
    );

    const s3DeckUrl = `https://${bucket}.s3.${region}.amazonaws.com/${deckKey}`;
    console.log("✓ S3 Upload SUCCESS!");
    console.log(`✓ S3 Deck URL: ${s3DeckUrl}\n`);

    // 3. Link S3 URLs to Neon DB records
    console.log("3. Storing S3 URLs in Neon PostgreSQL database...");
    const userRes = await client.query("SELECT id FROM users LIMIT 1");
    const userId = userRes.rows[0].id;

    // Save Freeze submission
    await client.query("DELETE FROM freeze_submission WHERE fk_user = $1", [userId]);
    const freezeRes = await client.query(
      `INSERT INTO freeze_submission (submission, photo_title, camera_device, description, active_submission, fk_user, created_at, updated_at)
       VALUES ($1, 'Live Campus Sunset', 'Canon EOS R6', 'Captured for live test', true, $2, NOW(), NOW())
       RETURNING *;`,
      [s3PhotoUrl, userId]
    );

    // Save Innowave submission
    await client.query("DELETE FROM innowave WHERE fk_user = $1", [userId]);
    const innoRes = await client.query(
      `INSERT INTO innowave (Innowave_type, submission, video_pitch_url, team_name, active_submission, fk_user, created_at, updated_at)
       VALUES ('Future Tech', $1, 'https://youtu.be/live_demo', 'CloudPioneers', true, $2, NOW(), NOW())
       RETURNING *;`,
      [s3DeckUrl, userId]
    );

    console.log("✓ Records saved in Neon DB!");
    console.log(`   - Freeze Entry ID: ${freezeRes.rows[0].id} (S3 URL saved)`);
    console.log(`   - Innowave Entry ID: ${innoRes.rows[0].id} (S3 URL saved)\n`);

    console.log("==================================================");
    console.log("🎉 LIVE AWS S3 UPLOAD & NEON DB PIPELINE FULLY WORKING!");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testLiveS3Upload();
