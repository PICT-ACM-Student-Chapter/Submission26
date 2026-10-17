const client = require("./connect");

async function runMigration() {
  console.log("Starting database migration for the 4 events (HackNova, Freeze The Second, Innowave, Root Cause)...");
  try {
    // 1. HackNova table
    await client.query(`
      CREATE TABLE IF NOT EXISTS hacknova (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        team_name VARCHAR(255),
        project_title VARCHAR(255),
        submission_file_url VARCHAR(2048),
        github_url VARCHAR(2048),
        live_demo_url VARCHAR(2048),
        notes TEXT,
        active_submission BOOLEAN NOT NULL DEFAULT true,
        fk_user INT,
        CONSTRAINT fk_user_hacknova FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ Table 'hacknova' verified/created.");

    // 2. Root Cause table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rootcause (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        team_name VARCHAR(255),
        submission_file_url VARCHAR(2048),
        github_pr_url VARCHAR(2048),
        notes TEXT,
        active_submission BOOLEAN NOT NULL DEFAULT true,
        fk_user INT,
        CONSTRAINT fk_user_rootcause FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ Table 'rootcause' verified/created.");

    // 3. Freeze The Second columns
    await client.query(`
      ALTER TABLE freeze_submission 
        ADD COLUMN IF NOT EXISTS photo_title VARCHAR(255),
        ADD COLUMN IF NOT EXISTS camera_device VARCHAR(255),
        ADD COLUMN IF NOT EXISTS description TEXT;
    `);
    console.log("✓ Table 'freeze_submission' columns updated.");

    // 4. Innowave columns
    await client.query(`
      ALTER TABLE innowave 
        ADD COLUMN IF NOT EXISTS video_pitch_url VARCHAR(2048),
        ADD COLUMN IF NOT EXISTS team_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS changelog TEXT;
    `);
    console.log("✓ Table 'innowave' columns updated.");

    // 5. Seed submission portals
    await client.query(`
      INSERT INTO submission_event (event_id, event_name, event_route, event_status)
      VALUES 
        (20, 'HACKNOVA', '/hacknova', true),
        (10, 'FREEZE THE SECOND', '/freeze', true),
        (12, 'INNOWAVE', '/innowave', true),
        (21, 'ROOT CAUSE', '/rootcause', true)
      ON CONFLICT (event_id) 
      DO UPDATE SET 
        event_name = EXCLUDED.event_name,
        event_route = EXCLUDED.event_route,
        event_status = EXCLUDED.event_status;
    `);
    console.log("✓ Portals seeded in 'submission_event'.");

    console.log("\nMigration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
