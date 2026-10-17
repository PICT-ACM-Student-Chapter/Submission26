const client = require("./connect");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function fetchEventsFromEMS() {
  const baseUrl = process.env.EMS_API || "https://65.1.36.0";
  console.log(`📡 Fetching events catalog from ${baseUrl}/events...`);
  try {
    const listRes = await axios.get(`${baseUrl}/events`, { httpsAgent, timeout: 10000 });
    const eventList = listRes.data?.events || [];
    console.log(`   Found ${eventList.length} events from EMS. Fetching detailed event data from ${baseUrl}/events/:eventid...`);

    const detailedEvents = [];
    for (const item of eventList) {
      try {
        const detailRes = await axios.get(`${baseUrl}/events/${item.id}`, { httpsAgent, timeout: 6000 });
        const ev = detailRes.data?.events || item;
        detailedEvents.push(ev);
        console.log(`   ✓ Fetched details for [${ev.id}] ${ev.name}`);
      } catch (err) {
        console.warn(`   ⚠️ Could not fetch individual details for event ${item.id}, using list item: ${err.message}`);
        detailedEvents.push(item);
      }
    }
    return detailedEvents;
  } catch (err) {
    console.warn(`⚠️ EMS fetch error (${err.message}). Using local fallback event list.`);
    return eventsJson;
  }
}

const eventsJson = [
  {
    id: 3,
    name: "CODEX",
    description: "Codex is a logic and problem-solving competition exclusively for first-year students.",
    type: "Technical",
    mode: "Offline",
    is_active: true,
    play: true,
    price: 30,
    tagline: "Think. Solve. Conquer.",
    logo: "/ems-assets/landing/events/codex.png",
    rules: "Rules for Codex",
    rounds: "Round 1, Round 2",
    teams: "Individual",
    notes: "Notes",
  },
  {
    id: 22,
    name: "TECHQUEST",
    description: "TechQuest combines the adrenaline rush of a physical treasure hunt.",
    type: "Technical",
    mode: "Offline",
    is_active: true,
    play: true,
    price: 50,
    tagline: "The grid is live. The clock is ticking.",
    logo: "/ems-assets/landing/events/TechQuest.png",
    rules: "Rules for TechQuest",
    rounds: "Round 1",
    teams: "Teams of 2 to 5",
    notes: "Notes",
  },
  {
    id: 10,
    name: "FREEZE THE SECOND",
    description: "Freeze the Second is a photography contest.",
    type: "Non Technical",
    mode: "Online",
    is_active: true,
    play: true,
    price: 20,
    tagline: "Capture What Others Miss.",
    logo: "/ems-assets/landing/events/freeze-the-second.png",
    rules: "Rules for Freeze",
    rounds: "Single Round",
    teams: "Individual",
    notes: "Notes",
  },
  {
    id: 5,
    name: "DATAQUEST",
    description: "Dataquest is an event designed to evaluate machine learning.",
    type: "Technical",
    mode: "Online",
    is_active: true,
    play: true,
    price: 50,
    tagline: "Data. Models. Mastery.",
    logo: "/ems-assets/landing/events/DataQuest.png",
    rules: "Rules for DataQuest",
    rounds: "Round 1, Round 2",
    teams: "Individual",
    notes: "Notes",
  },
  {
    id: 20,
    name: "HACKNOVA",
    description: "HackNova is a technical hackathon designed to challenge participants.",
    type: "Technical",
    mode: "Blended",
    is_active: true,
    play: true,
    price: 100,
    tagline: "Innovate. Build. Conquer.",
    logo: "/ems-assets/landing/events/HackNova.png",
    rules: "Rules for HackNova",
    rounds: "Round 1, Round 2, Round 3",
    teams: "Teams of 2 to 4",
    notes: "Notes",
  },
  {
    id: 1,
    name: "CODELICIOUS",
    description: "Codelicious is an ICPC-style competitive programming contest.",
    type: "Technical",
    mode: "Blended",
    is_active: true,
    play: true,
    price: 150,
    tagline: "Think × Code × Solve × Together",
    logo: "/ems-assets/landing/events/Codelicious.png",
    rules: "Rules for Codelicious",
    rounds: "Round 1, Round 2",
    teams: "Teams of 1 to 3",
    notes: "Notes",
  },
  {
    id: 7,
    name: "DEXTROUS",
    description: "Dextrous gives you a real taste of the placement journey.",
    type: "Non Technical",
    mode: "Offline",
    is_active: true,
    play: true,
    price: 50,
    tagline: "Simulate. Adapt. Excel.",
    logo: "/ems-assets/landing/events/Dextrous.png",
    rules: "Rules for Dextrous",
    rounds: "Round 1, Round 2, Round 3",
    teams: "Individual",
    notes: "Notes",
  },
  {
    id: 21,
    name: "ROOT CAUSE",
    description: "ROOT CAUSE is a 2-day Bugathon organized in collaboration with the PICT OSS Community.",
    type: "Technical",
    mode: "Blended",
    is_active: true,
    play: true,
    price: 50,
    tagline: "Root Cause: Find it. Fix it. Ship it.",
    logo: "/ems-assets/landing/events/pasc-x-oss.png",
    rules: "Rules for Root Cause",
    rounds: "Round 1, Round 2",
    teams: "Teams of 1 or 2",
    notes: "Notes",
  },
  {
    id: 12,
    name: "INNOWAVE",
    description: "Innowave is an ideathon where teams of 2 to 4 students pitch their ideas.",
    type: "Non Technical",
    mode: "Blended",
    is_active: true,
    play: true,
    price: 20,
    tagline: "Got an idea? Bring it.",
    logo: "/ems-assets/landing/events/Innowave.png",
    rules: "Rules for Innowave",
    rounds: "Round 1, Round 2, Round 3",
    teams: "Teams of 2 to 4",
    notes: "Notes",
  },
];

async function initializeDatabase() {
  console.log("Connecting and initializing Neon database schema...");
  try {
    // 1. Enum Types
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE years AS ENUM ('FE', 'SE', 'TE', 'BE');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE choice AS ENUM ('Technical', 'Non Technical');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE store AS ENUM ('Online', 'Offline', 'Blended');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✓ Enums created.");

    // 2. Base Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        mobile_number VARCHAR(100) NOT NULL UNIQUE,
        college VARCHAR(255) NOT NULL,
        year years NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ems_id INT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_token (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        token VARCHAR(255) NOT NULL,
        is_valid BOOLEAN NOT NULL,
        ems_token VARCHAR(256) NOT NULL,
        fk_user INT,
        CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS event (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        type TEXT,
        mode TEXT, 
        is_active BOOLEAN NOT NULL DEFAULT true,
        play BOOLEAN NOT NULL DEFAULT true,
        price INT NOT NULL DEFAULT 0,
        link VARCHAR(2048),
        whatsapp_link VARCHAR(2048),
        tagline VARCHAR(2048) NOT NULL DEFAULT '',
        logo VARCHAR(2048) NOT NULL DEFAULT '',
        rules TEXT NOT NULL DEFAULT '',
        rounds TEXT NOT NULL DEFAULT '',
        teams TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS submission_event (
        event_id INT NOT NULL UNIQUE,
        event_name TEXT NOT NULL,
        event_route TEXT NOT NULL,
        event_status BOOLEAN DEFAULT true,
        CONSTRAINT fk_event FOREIGN KEY(event_id) REFERENCES event(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_events (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        fk_event INT NOT NULL,
        fk_user INT,
        CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_event FOREIGN KEY(fk_event) REFERENCES event(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS freeze_submission (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        submission VARCHAR(2048) NOT NULL,
        photo_title VARCHAR(255),
        camera_device VARCHAR(255),
        description TEXT,
        active_submission BOOLEAN NOT NULL DEFAULT true,
        fk_user INT,
        ems_user_id INT,
        CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS InnoWave (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE, 
        Innowave_type TEXT NOT NULL,
        submission VARCHAR(2048) NOT NULL,
        video_pitch_url VARCHAR(2048),
        team_name VARCHAR(255),
        changelog TEXT,
        active_submission BOOLEAN NOT NULL DEFAULT true,
        fk_user INT,
        ems_user_id INT,
        CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS hacknova (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        team_name VARCHAR(255),
        project_title VARCHAR(255),
        submission_file_url VARCHAR(2048),
        presentation_url VARCHAR(2048),
        project_zip_url VARCHAR(2048),
        github_url VARCHAR(2048),
        live_demo_url VARCHAR(2048),
        notes TEXT,
        active_submission BOOLEAN NOT NULL DEFAULT true,
        fk_user INT,
        ems_user_id INT,
        CONSTRAINT fk_user_hacknova FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rootcause (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        team_name VARCHAR(255),
        submission_file_url VARCHAR(2048),
        github_pr_url VARCHAR(2048),
        github_repo_url VARCHAR(2048),
        notes TEXT,
        active_submission BOOLEAN NOT NULL DEFAULT true,
        fk_user INT,
        ems_user_id INT,
        CONSTRAINT fk_user_rootcause FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS Admin (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_token (
        id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
        token VARCHAR(255) NOT NULL,
        is_valid BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        fk_admin INT,
        CONSTRAINT fk_admin FOREIGN KEY(fk_admin) REFERENCES Admin(id) ON DELETE CASCADE
      );
    `);
    console.log("✓ All base and event tables created.");

    // 3. Upsert Events (dynamically fetched from EMS /events and /events/:id)
    const eventsToInsert = await fetchEventsFromEMS();
    for (const ev of eventsToInsert) {
      await client.query(`
        INSERT INTO event (
          id, name, description, type, mode, is_active, play, price, link, whatsapp_link,
          tagline, logo, rules, rounds, teams, notes, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          type = EXCLUDED.type,
          mode = EXCLUDED.mode,
          is_active = EXCLUDED.is_active,
          play = EXCLUDED.play,
          price = EXCLUDED.price,
          link = EXCLUDED.link,
          whatsapp_link = EXCLUDED.whatsapp_link,
          tagline = EXCLUDED.tagline,
          logo = EXCLUDED.logo,
          rules = EXCLUDED.rules,
          rounds = EXCLUDED.rounds,
          teams = EXCLUDED.teams,
          notes = EXCLUDED.notes,
          updated_at = EXCLUDED.updated_at;
      `, [
        ev.id,
        ev.name || '',
        ev.description || '',
        ev.type || null,
        ev.mode || null,
        ev.is_active !== undefined ? ev.is_active : true,
        ev.play !== undefined ? ev.play : true,
        typeof ev.price === 'number' ? ev.price : (parseInt(ev.price, 10) || 0),
        ev.link || null,
        ev.whatsapp_link || null,
        ev.tagline || '',
        ev.logo || '',
        ev.rules || '',
        ev.rounds || '',
        ev.teams || '',
        ev.notes || '',
        ev.created_at ? new Date(ev.created_at) : new Date(),
        ev.updated_at ? new Date(ev.updated_at) : new Date(),
      ]);
    }
    console.log(`✓ Events catalog populated with ${eventsToInsert.length} events.`);

    // 4. Seed Submission Portals for 4 Target Events
    await client.query(`
      INSERT INTO submission_event (event_id, event_name, event_route, event_status)
      VALUES 
        (20, 'HACKNOVA', '/hacknova', true),
        (10, 'FREEZE THE SECOND', '/freeze', true),
        (12, 'INNOWAVE', '/innowave', true),
        (21, 'ROOT CAUSE', '/rootcause', true)
      ON CONFLICT (event_id) DO UPDATE SET
        event_name = EXCLUDED.event_name,
        event_route = EXCLUDED.event_route,
        event_status = EXCLUDED.event_status;
    `);
    console.log("✓ Submission events configured for HackNova (20), Freeze (10), Innowave (12), Root Cause (21).");

    console.log("\nAll schema operations succeeded!");
    process.exit(0);
  } catch (err) {
    console.error("Initialization error:", err);
    process.exit(1);
  }
}

initializeDatabase();
