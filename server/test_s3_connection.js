require("dotenv").config({ path: "./.env.dev" });
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

async function testAcl() {
  const bucket = "pulzion-submissions-bucket";
  const region = "ap-south-1";

  const s3 = new S3Client({
    region: region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const testKey = `submissions/test/test-acl-${Date.now()}.txt`;
  try {
    console.log("Testing upload with ACL: 'public-read'...");
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: "ACL check",
        ContentType: "text/plain",
        ACL: "public-read",
      })
    );
    console.log("✓ Upload with ACL 'public-read' succeeded!");
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: testKey }));
  } catch (e) {
    console.log("ACL check result:", e.message);
  }
}

testAcl();
