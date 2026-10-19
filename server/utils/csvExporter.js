const client = require("../db/connect");
const { Parser } = require("json2csv");

/**
 * Format date to Indian Standard Time (IST) readable string
 */
function formatISTDate(dateVal) {
  if (!dateVal) return "N/A";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return String(dateVal);
  }
}

/**
 * Specifications for each event's CSV generation
 */
const EVENT_SPECS = {
  hacknova: {
    eventName: "HackNova",
    emsId: 20,
    table: "hacknova",
    aliases: ["hacknova", "hack-nova", "hack_nova", "20", "hack"],
    query: `
      SELECT 
        h.id AS submission_id,
        u.first_name,
        u.last_name,
        u.email,
        u.mobile_number,
        u.college,
        u.year,
        COALESCE(h.ems_user_id, u.ems_id) AS ems_id,
        h.team_name,
        h.project_title,
        h.github_url,
        COALESCE(h.presentation_url, '') AS presentation_url,
        COALESCE(h.project_zip_url, h.submission_file_url, '') AS project_zip_url,
        h.live_demo_url,
        h.notes,
        h.active_submission,
        h.created_at,
        h.updated_at
      FROM hacknova h
      INNER JOIN users u ON h.fk_user = u.id
      ORDER BY h.created_at DESC;
    `,
    fields: [
      { label: "Submission ID", value: "submission_id" },
      { label: "EMS ID", value: "ems_id" },
      { label: "Participant Name", value: "participant_name" },
      { label: "Email", value: "email" },
      { label: "Mobile Number", value: "mobile_number" },
      { label: "College", value: "college" },
      { label: "Year", value: "year" },
      { label: "Team Name", value: "team_name" },
      { label: "Project Title", value: "project_title" },
      { label: "GitHub Repo Link", value: "github_url" },
      { label: "Presentation Deck (PPTX/PDF)", value: "presentation_url" },
      { label: "Project ZIP Archive", value: "project_zip_url" },
      { label: "Live Demo URL", value: "live_demo_url" },
      { label: "Notes / Description", value: "notes" },
      { label: "Active Submission", value: "active_submission" },
      { label: "Submitted At (IST)", value: "created_at_ist" },
    ],
    mapRow: (row) => ({
      submission_id: row.submission_id,
      ems_id: row.ems_id || "N/A",
      participant_name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      email: row.email || "",
      mobile_number: row.mobile_number || "",
      college: row.college || "",
      year: row.year || "",
      team_name: row.team_name || "N/A",
      project_title: row.project_title || "N/A",
      github_url: row.github_url || "N/A",
      presentation_url: row.presentation_url || "N/A",
      project_zip_url: row.project_zip_url || "N/A",
      live_demo_url: row.live_demo_url || "N/A",
      notes: row.notes || "",
      active_submission: row.active_submission ? "Yes" : "No",
      created_at_ist: formatISTDate(row.created_at),
    }),
  },

  hacknova_teams: {
    eventName: "HackNova Squad Registrations",
    emsId: 200,
    displayEmsId: 20,
    table: "hacknova_teams",
    aliases: [
      "hacknova-teams",
      "hacknova_teams",
      "hacknova-team",
      "hacknova_team",
      "hacknovateams",
      "200",
      "teams",
      "squads",
    ],
    query: `
      SELECT 
        t.id AS team_id,
        t.team_name,
        t.created_at AS team_created_at,
        u.first_name AS leader_first_name,
        u.last_name AS leader_last_name,
        u.email AS leader_email,
        u.mobile_number AS leader_phone,
        u.college AS leader_college,
        u.year AS leader_year,
        u.ems_id AS leader_ems_id,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'name', m.user_name,
              'email', m.email,
              'phone', m.phone,
              'role', m.role
            ) ORDER BY m.id ASC
          ) FILTER (WHERE m.id IS NOT NULL), '[]'
        ) AS members
      FROM hacknova_teams t
      JOIN users u ON t.leader_user_id = u.id
      LEFT JOIN hacknova_team_members m ON t.id = m.team_id
      GROUP BY t.id, t.team_name, t.created_at, u.id, u.first_name, u.last_name, u.email, u.mobile_number, u.college, u.year, u.ems_id
      ORDER BY t.created_at DESC;
    `,
    fields: [
      { label: "Team ID", value: "team_id" },
      { label: "Team Name", value: "team_name" },
      { label: "Total Members", value: "total_members" },
      { label: "Leader Name", value: "leader_name" },
      { label: "Leader Email", value: "leader_email" },
      { label: "Leader Phone", value: "leader_phone" },
      { label: "Leader College", value: "leader_college" },
      { label: "Leader Year", value: "leader_year" },
      { label: "Leader EMS ID", value: "leader_ems_id" },
      { label: "Member 2 Name", value: "member2_name" },
      { label: "Member 2 Email", value: "member2_email" },
      { label: "Member 2 Phone", value: "member2_phone" },
      { label: "Member 3 Name", value: "member3_name" },
      { label: "Member 3 Email", value: "member3_email" },
      { label: "Member 3 Phone", value: "member3_phone" },
      { label: "Member 4 Name", value: "member4_name" },
      { label: "Member 4 Email", value: "member4_email" },
      { label: "Member 4 Phone", value: "member4_phone" },
      { label: "Full Squad Roster", value: "roster_summary" },
      { label: "Registered At (IST)", value: "created_at_ist" },
    ],
    mapRow: (row) => {
      let members = [];
      try {
        members = Array.isArray(row.members)
          ? row.members
          : typeof row.members === "string"
          ? JSON.parse(row.members)
          : [];
      } catch (e) {
        members = [];
      }

      // Filter out leader row so members 2, 3, 4 are accurately mapped
      const otherMembers = members.filter(
        (m) => m.role !== "leader" && m.email !== row.leader_email
      );
      const m2 = otherMembers[0] || {};
      const m3 = otherMembers[1] || {};
      const m4 = otherMembers[2] || {};
      const leaderName = `${row.leader_first_name || ""} ${row.leader_last_name || ""}`.trim();
      const allRoster = [
        `Leader: ${leaderName} (${row.leader_email})`,
        m2.name ? `Member 2: ${m2.name} (${m2.email})` : null,
        m3.name ? `Member 3: ${m3.name} (${m3.email})` : null,
        m4.name ? `Member 4: ${m4.name} (${m4.email})` : null,
      ].filter(Boolean).join(" | ");

      return {
        team_id: row.team_id,
        team_name: row.team_name,
        total_members: 1 + otherMembers.length,
        leader_name: leaderName,
        leader_email: row.leader_email || "",
        leader_phone: row.leader_phone || "",
        leader_college: row.leader_college || "",
        leader_year: row.leader_year || "",
        leader_ems_id: row.leader_ems_id || "N/A",
        member2_name: m2.name || "",
        member2_email: m2.email || "",
        member2_phone: m2.phone || "",
        member3_name: m3.name || "",
        member3_email: m3.email || "",
        member3_phone: m3.phone || "",
        member4_name: m4.name || "",
        member4_email: m4.email || "",
        member4_phone: m4.phone || "",
        roster_summary: allRoster,
        created_at_ist: formatISTDate(row.team_created_at),
      };
    },
  },

  freeze: {
    eventName: "Freeze the Second",
    emsId: 10,
    table: "freeze_submission",
    aliases: [
      "freeze",
      "freeze_submission",
      "freezethesecond",
      "freeze-the-second",
      "freeze_the_second",
      "10",
      "fts",
    ],
    query: `
      SELECT 
        f.id AS submission_id,
        u.first_name,
        u.last_name,
        u.email,
        u.mobile_number,
        u.college,
        u.year,
        COALESCE(f.ems_user_id, u.ems_id) AS ems_id,
        f.photo_title,
        f.camera_device,
        f.description,
        f.submission AS photo_url,
        f.active_submission,
        f.created_at,
        f.updated_at
      FROM freeze_submission f
      INNER JOIN users u ON f.fk_user = u.id
      ORDER BY f.created_at DESC;
    `,
    fields: [
      { label: "Submission ID", value: "submission_id" },
      { label: "EMS ID", value: "ems_id" },
      { label: "Participant Name", value: "participant_name" },
      { label: "Email", value: "email" },
      { label: "Mobile Number", value: "mobile_number" },
      { label: "College", value: "college" },
      { label: "Year", value: "year" },
      { label: "Photo Title", value: "photo_title" },
      { label: "Camera / Device Used", value: "camera_device" },
      { label: "Description", value: "description" },
      { label: "Photograph URL (JPG/JPEG/PNG)", value: "photo_url" },
      { label: "Active Submission", value: "active_submission" },
      { label: "Submitted At (IST)", value: "created_at_ist" },
    ],
    mapRow: (row) => ({
      submission_id: row.submission_id,
      ems_id: row.ems_id || "N/A",
      participant_name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      email: row.email || "",
      mobile_number: row.mobile_number || "",
      college: row.college || "",
      year: row.year || "",
      photo_title: row.photo_title || "Untitled",
      camera_device: row.camera_device || "N/A",
      description: row.description || "",
      photo_url: row.photo_url || "N/A",
      active_submission: row.active_submission ? "Yes" : "No",
      created_at_ist: formatISTDate(row.created_at),
    }),
  },

  innowave: {
    eventName: "InnoWave",
    emsId: 12,
    table: "innowave",
    aliases: [
      "innowave",
      "inno-wave",
      "inno_wave",
      "innowave1",
      "innowave2",
      "12",
    ],
    query: `
      SELECT 
        i.id AS submission_id,
        u.first_name,
        u.last_name,
        u.email,
        u.mobile_number,
        u.college,
        u.year,
        COALESCE(i.ems_user_id, u.ems_id) AS ems_id,
        i.team_name,
        i.Innowave_type AS track,
        i.submission AS deck_url,
        i.video_pitch_url,
        i.changelog,
        i.active_submission,
        i.created_at,
        i.updated_at
      FROM innowave i
      INNER JOIN users u ON i.fk_user = u.id
      ORDER BY i.created_at DESC;
    `,
    fields: [
      { label: "Submission ID", value: "submission_id" },
      { label: "EMS ID", value: "ems_id" },
      { label: "Participant Name", value: "participant_name" },
      { label: "Email", value: "email" },
      { label: "Mobile Number", value: "mobile_number" },
      { label: "College", value: "college" },
      { label: "Year", value: "year" },
      { label: "Team Name", value: "team_name" },
      { label: "Track / Category", value: "track" },
      { label: "Pitch Deck URL (PPTX/PDF)", value: "deck_url" },
      { label: "Video Pitch URL", value: "video_pitch_url" },
      { label: "Round 2 Changelog", value: "changelog" },
      { label: "Active Submission", value: "active_submission" },
      { label: "Submitted At (IST)", value: "created_at_ist" },
    ],
    mapRow: (row) => ({
      submission_id: row.submission_id,
      ems_id: row.ems_id || "N/A",
      participant_name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      email: row.email || "",
      mobile_number: row.mobile_number || "",
      college: row.college || "",
      year: row.year || "",
      team_name: row.team_name || "N/A",
      track: row.track || "N/A",
      deck_url: row.deck_url || "N/A",
      video_pitch_url: row.video_pitch_url || "N/A",
      changelog: row.changelog || "",
      active_submission: row.active_submission ? "Yes" : "No",
      created_at_ist: formatISTDate(row.created_at),
    }),
  },

  innowave_teams: {
    eventName: "InnoWave Team Registrations",
    emsId: 201,
    displayEmsId: 12,
    table: "innowave_teams",
    aliases: [
      "innowave-teams",
      "innowave_teams",
      "innowave-team",
      "innowave_team",
      "innowaveteams",
      "201",
    ],
    query: `
      SELECT 
        t.id AS team_id,
        t.team_name,
        t.created_at AS team_created_at,
        u.first_name AS leader_first_name,
        u.last_name AS leader_last_name,
        u.email AS leader_email,
        u.mobile_number AS leader_phone,
        u.college AS leader_college,
        u.year AS leader_year,
        u.ems_id AS leader_ems_id,
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'name', m.user_name,
              'email', m.email,
              'phone', m.phone,
              'role', m.role
            ) ORDER BY m.id ASC
          ) FILTER (WHERE m.id IS NOT NULL), '[]'
        ) AS members
      FROM innowave_teams t
      JOIN users u ON t.leader_user_id = u.id
      LEFT JOIN innowave_team_members m ON t.id = m.team_id
      GROUP BY t.id, t.team_name, t.created_at, u.id, u.first_name, u.last_name, u.email, u.mobile_number, u.college, u.year, u.ems_id
      ORDER BY t.created_at DESC;
    `,
    fields: [
      { label: "Team ID", value: "team_id" },
      { label: "Team Name", value: "team_name" },
      { label: "Total Members", value: "total_members" },
      { label: "Leader Name", value: "leader_name" },
      { label: "Leader Email", value: "leader_email" },
      { label: "Leader Phone", value: "leader_phone" },
      { label: "Leader College", value: "leader_college" },
      { label: "Leader Year", value: "leader_year" },
      { label: "Leader EMS ID", value: "leader_ems_id" },
      { label: "Member 2 Name", value: "member2_name" },
      { label: "Member 2 Email", value: "member2_email" },
      { label: "Member 2 Phone", value: "member2_phone" },
      { label: "Member 3 Name", value: "member3_name" },
      { label: "Member 3 Email", value: "member3_email" },
      { label: "Member 3 Phone", value: "member3_phone" },
      { label: "Member 4 Name", value: "member4_name" },
      { label: "Member 4 Email", value: "member4_email" },
      { label: "Member 4 Phone", value: "member4_phone" },
      { label: "Full Team Roster", value: "roster_summary" },
      { label: "Registered At (IST)", value: "created_at_ist" },
    ],
    mapRow: (row) => {
      let members = [];
      try {
        members = Array.isArray(row.members)
          ? row.members
          : typeof row.members === "string"
          ? JSON.parse(row.members)
          : [];
      } catch (e) {
        members = [];
      }

      // Filter out leader row so members 2, 3, 4 are accurately mapped
      const otherMembers = members.filter(
        (m) => m.role !== "leader" && m.email !== row.leader_email
      );
      const m2 = otherMembers[0] || {};
      const m3 = otherMembers[1] || {};
      const m4 = otherMembers[2] || {};
      const leaderName = `${row.leader_first_name || ""} ${row.leader_last_name || ""}`.trim();
      const allRoster = [
        `Leader: ${leaderName} (${row.leader_email})`,
        m2.name ? `Member 2: ${m2.name} (${m2.email})` : null,
        m3.name ? `Member 3: ${m3.name} (${m3.email})` : null,
        m4.name ? `Member 4: ${m4.name} (${m4.email})` : null,
      ].filter(Boolean).join(" | ");

      return {
        team_id: row.team_id,
        team_name: row.team_name,
        total_members: 1 + otherMembers.length,
        leader_name: leaderName,
        leader_email: row.leader_email || "",
        leader_phone: row.leader_phone || "",
        leader_college: row.leader_college || "",
        leader_year: row.leader_year || "",
        leader_ems_id: row.leader_ems_id || "N/A",
        member2_name: m2.name || "",
        member2_email: m2.email || "",
        member2_phone: m2.phone || "",
        member3_name: m3.name || "",
        member3_email: m3.email || "",
        member3_phone: m3.phone || "",
        member4_name: m4.name || "",
        member4_email: m4.email || "",
        member4_phone: m4.phone || "",
        roster_summary: allRoster,
        created_at_ist: formatISTDate(row.team_created_at),
      };
    },
  },

  rootcause: {
    eventName: "Root Cause",
    emsId: 21,
    table: "rootcause",
    aliases: [
      "rootcause",
      "root-cause",
      "root_cause",
      "21",
      "rc",
    ],
    query: `
      SELECT 
        r.id AS submission_id,
        u.first_name,
        u.last_name,
        u.email,
        u.mobile_number,
        u.college,
        u.year,
        COALESCE(r.ems_user_id, u.ems_id) AS ems_id,
        r.team_name,
        COALESCE(r.github_repo_url, '') AS github_repo_url,
        r.github_pr_url,
        r.submission_file_url,
        r.notes,
        r.active_submission,
        r.created_at,
        r.updated_at
      FROM rootcause r
      INNER JOIN users u ON r.fk_user = u.id
      ORDER BY r.created_at DESC;
    `,
    fields: [
      { label: "Submission ID", value: "submission_id" },
      { label: "EMS ID", value: "ems_id" },
      { label: "Participant Name", value: "participant_name" },
      { label: "Email", value: "email" },
      { label: "Mobile Number", value: "mobile_number" },
      { label: "College", value: "college" },
      { label: "Year", value: "year" },
      { label: "Team Name", value: "team_name" },
      { label: "GitHub Repo / Fork Link", value: "github_repo_url" },
      { label: "Branch / Pull Request (PR) Link", value: "github_pr_url" },
      { label: "Patch / Archive URL (S3)", value: "submission_file_url" },
      { label: "Notes / Fix Explanation", value: "notes" },
      { label: "Active Submission", value: "active_submission" },
      { label: "Submitted At (IST)", value: "created_at_ist" },
    ],
    mapRow: (row) => ({
      submission_id: row.submission_id,
      ems_id: row.ems_id || "N/A",
      participant_name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
      email: row.email || "",
      mobile_number: row.mobile_number || "",
      college: row.college || "",
      year: row.year || "",
      team_name: row.team_name || "N/A",
      github_repo_url: row.github_repo_url || "N/A",
      github_pr_url: row.github_pr_url || "N/A",
      submission_file_url: row.submission_file_url || "N/A",
      notes: row.notes || "",
      active_submission: row.active_submission ? "Yes" : "No",
      created_at_ist: formatISTDate(row.created_at),
    }),
  },
};

/**
 * Resolve an event identifier (slug, route, id, alias) to spec
 */
function resolveEventSpec(eventIdentifier) {
  if (!eventIdentifier) return null;
  const clean = String(eventIdentifier).trim().toLowerCase().replace(/^\//, "");

  if (EVENT_SPECS[clean]) {
    return EVENT_SPECS[clean];
  }

  for (const key of Object.keys(EVENT_SPECS)) {
    const spec = EVENT_SPECS[key];
    if (key === clean || (spec.aliases && spec.aliases.includes(clean))) {
      return spec;
    }
  }
  return null;
}

/**
 * Generate CSV for a specific event
 */
async function generateEventCsv(eventIdentifier) {
  const spec = resolveEventSpec(eventIdentifier);
  if (!spec) {
    throw new Error(`Unknown event: "${eventIdentifier}". Supported events: ${Object.keys(EVENT_SPECS).join(", ")}`);
  }

  const result = await client.query(spec.query);
  const formattedRows = result.rows.map(spec.mapRow);

  const json2csvParser = new Parser({
    fields: spec.fields,
    defaultValue: "",
  });

  const rawCsv = json2csvParser.parse(formattedRows);
  // UTF-8 BOM (\uFEFF) ensures Excel opens special characters cleanly without garbling
  const csvWithBOM = "\uFEFF" + rawCsv;

  const safeName = spec.eventName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `${safeName}_submissions_${dateStr}.csv`;

  return {
    eventName: spec.eventName,
    filename,
    csv: csvWithBOM,
    count: result.rowCount,
    rows: formattedRows,
  };
}

/**
 * Generate Master CSV containing all submissions across all 4 events
 */
async function generateMasterAllEventsCsv() {
  const allSubmissions = [];

  for (const key of Object.keys(EVENT_SPECS)) {
    const spec = EVENT_SPECS[key];
    const result = await client.query(spec.query);

    for (const r of result.rows) {
      let primaryUrl = "N/A";
      let secondaryUrl = "N/A";
      let titleOrTeam = "N/A";
      let details = "";

      if (key === "hacknova") {
        primaryUrl = r.presentation_url || r.project_zip_url || "N/A";
        secondaryUrl = r.github_url || r.live_demo_url || "N/A";
        titleOrTeam = `${r.team_name ? r.team_name + " - " : ""}${r.project_title || "N/A"}`;
        details = r.notes || "";
      } else if (key === "hacknova_teams") {
        const memCount = Array.isArray(r.members) ? r.members.length : 1;
        primaryUrl = `Squad (${memCount} members)`;
        secondaryUrl = `Leader Phone: ${r.leader_phone || "N/A"}`;
        titleOrTeam = r.team_name || "N/A";
        details = `Leader: ${r.leader_first_name || ""} ${r.leader_last_name || ""} (${r.leader_email || ""})`;
      } else if (key === "freeze") {
        primaryUrl = r.photo_url || "N/A";
        secondaryUrl = r.camera_device || "N/A";
        titleOrTeam = r.photo_title || "Untitled";
        details = r.description || "";
      } else if (key === "innowave") {
        primaryUrl = r.deck_url || "N/A";
        secondaryUrl = r.video_pitch_url || "N/A";
        titleOrTeam = `${r.team_name || "N/A"} (${r.track || "General"})`;
        details = r.changelog || "";
      } else if (key === "innowave_teams") {
        const memCount = Array.isArray(r.members) ? r.members.length : 1;
        primaryUrl = `Team (${memCount} members)`;
        secondaryUrl = `Leader Phone: ${r.leader_phone || "N/A"}`;
        titleOrTeam = r.team_name || "N/A";
        details = `Leader: ${r.leader_first_name || ""} ${r.leader_last_name || ""} (${r.leader_email || ""})`;
      } else if (key === "rootcause") {
        primaryUrl = r.github_repo_url || r.submission_file_url || "N/A";
        secondaryUrl = r.github_pr_url || "N/A";
        titleOrTeam = r.team_name || "N/A";
        details = r.notes || "";
      }

      allSubmissions.push({
        event_name: spec.eventName,
        submission_id: r.submission_id || r.team_id,
        ems_id: r.ems_id || r.leader_ems_id || "N/A",
        participant_name: `${r.first_name || r.leader_first_name || ""} ${r.last_name || r.leader_last_name || ""}`.trim(),
        email: r.email || r.leader_email || "",
        mobile_number: r.mobile_number || r.leader_phone || "",
        college: r.college || r.leader_college || "",
        year: r.year || r.leader_year || "",
        title_or_team: titleOrTeam,
        primary_submission_url: primaryUrl,
        secondary_url: secondaryUrl,
        notes_details: details,
        active_submission: r.active_submission !== undefined ? (r.active_submission ? "Yes" : "No") : "Yes",
        created_at_ist: formatISTDate(r.created_at || r.team_created_at),
        raw_created_at: r.created_at || r.team_created_at,
      });
    }
  }

  // Sort descending by submission time
  allSubmissions.sort((a, b) => new Date(b.raw_created_at) - new Date(a.raw_created_at));

  const fields = [
    { label: "Event Name", value: "event_name" },
    { label: "Submission ID", value: "submission_id" },
    { label: "EMS ID", value: "ems_id" },
    { label: "Participant Name", value: "participant_name" },
    { label: "Email", value: "email" },
    { label: "Mobile Number", value: "mobile_number" },
    { label: "College", value: "college" },
    { label: "Year", value: "year" },
    { label: "Team / Project Title", value: "title_or_team" },
    { label: "Primary Submission Link (S3/File)", value: "primary_submission_url" },
    { label: "Secondary Link (GitHub/Video/Demo)", value: "secondary_url" },
    { label: "Notes / Details", value: "notes_details" },
    { label: "Active Submission", value: "active_submission" },
    { label: "Submitted At (IST)", value: "created_at_ist" },
  ];

  const json2csvParser = new Parser({ fields, defaultValue: "" });
  const rawCsv = json2csvParser.parse(allSubmissions);
  const csvWithBOM = "\uFEFF" + rawCsv;

  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `Pulzion2026_All_Events_Submissions_${dateStr}.csv`;

  return {
    eventName: "All Events Combined",
    filename,
    csv: csvWithBOM,
    count: allSubmissions.length,
    rows: allSubmissions,
  };
}

/**
 * Get summary stats and event list
 */
async function getEventsSummary() {
  const summary = [];
  for (const key of Object.keys(EVENT_SPECS)) {
    const spec = EVENT_SPECS[key];
    const res = await client.query(`SELECT COUNT(*) AS count FROM ${spec.table};`);
    
    // Fetch live submission acceptance status from submission_event
    let isSubmissionActive = true;
    let eventRoute =
      key === "hacknova_teams"
        ? "/hacknova-team"
        : key === "innowave_teams"
        ? "/innowave-team"
        : `/${key}`;
    try {
      const statusRes = await client.query(
        `SELECT event_status, event_route FROM submission_event WHERE event_id = $1 LIMIT 1;`,
        [spec.emsId]
      );
      if (statusRes.rows.length > 0) {
        isSubmissionActive = statusRes.rows[0].event_status !== false;
        if (statusRes.rows[0].event_route) {
          eventRoute = statusRes.rows[0].event_route;
        }
      }
    } catch (e) {
      console.error(`Error querying submission_event for ${spec.eventName}:`, e.message);
    }

    summary.push({
      key,
      name: spec.eventName,
      emsId: spec.emsId,
      displayEmsId: spec.displayEmsId || spec.emsId,
      table: spec.table,
      submissionsCount: parseInt(res.rows[0].count, 10),
      isSubmissionActive,
      eventStatus: isSubmissionActive,
      eventRoute,
      downloadPath: `/admin/csv/${key}`,
      directPath:
        key === "hacknova_teams"
          ? "/hacknova/teams/csv"
          : key === "innowave_teams"
          ? "/innowave/teams/csv"
          : `/${key}/csv`,
    });
  }
  return summary;
}

module.exports = {
  EVENT_SPECS,
  resolveEventSpec,
  generateEventCsv,
  generateMasterAllEventsCsv,
  getEventsSummary,
  formatISTDate,
};
