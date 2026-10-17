const client = require("./db/connect");
const {
  generateEventCsv,
  generateMasterAllEventsCsv,
  getEventsSummary,
  resolveEventSpec,
} = require("./utils/csvExporter");

async function runTests() {
  console.log("==================================================");
  console.log("🧪 TESTING EVENT-WISE CSV EXPORT ENGINE");
  console.log("==================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    // 1. Test Event Specs Resolution
    console.log("1. Testing Event Spec Resolver (Aliases & IDs):");
    assert(resolveEventSpec("hacknova")?.eventName === "HackNova", "Resolves 'hacknova'");
    assert(resolveEventSpec("20")?.eventName === "HackNova", "Resolves ID '20' to HackNova");
    assert(resolveEventSpec("freeze")?.eventName === "Freeze the Second", "Resolves 'freeze'");
    assert(resolveEventSpec("10")?.eventName === "Freeze the Second", "Resolves ID '10' to Freeze");
    assert(resolveEventSpec("innowave")?.eventName === "InnoWave", "Resolves 'innowave'");
    assert(resolveEventSpec("12")?.eventName === "InnoWave", "Resolves ID '12' to Innowave");
    assert(resolveEventSpec("rootcause")?.eventName === "Root Cause", "Resolves 'rootcause'");
    assert(resolveEventSpec("21")?.eventName === "Root Cause", "Resolves ID '21' to Root Cause");
    assert(resolveEventSpec("invalid_event") === null, "Returns null for invalid event");

    // 2. Test HackNova CSV Generation
    console.log("\n2. Testing HackNova CSV Generation:");
    const hacknovaCsv = await generateEventCsv("hacknova");
    assert(hacknovaCsv.count >= 1, `HackNova has ${hacknovaCsv.count} submissions`);
    assert(hacknovaCsv.csv.startsWith("\uFEFF"), "CSV starts with UTF-8 BOM");
    assert(hacknovaCsv.csv.includes("Participant Name"), "CSV contains 'Participant Name' header");
    assert(hacknovaCsv.csv.includes("Presentation Deck (PPTX/PDF)"), "CSV contains 'Presentation Deck (PPTX/PDF)' header");
    assert(hacknovaCsv.csv.includes("Project ZIP Archive"), "CSV contains 'Project ZIP Archive' header");
    assert(hacknovaCsv.csv.includes("CyberSquad"), "CSV contains team name 'CyberSquad'");
    assert(hacknovaCsv.csv.includes("Autonomous Campus Bot"), "CSV contains project title");
    assert(hacknovaCsv.filename.includes("HackNova_submissions_"), `Filename is '${hacknovaCsv.filename}'`);

    // 3. Test Freeze the Second CSV Generation
    console.log("\n3. Testing Freeze the Second CSV Generation:");
    const freezeCsv = await generateEventCsv("freeze");
    assert(freezeCsv.count >= 1, `Freeze has ${freezeCsv.count} submissions`);
    assert(freezeCsv.csv.includes("Photo Title"), "CSV contains 'Photo Title' header");
    assert(freezeCsv.csv.includes("Camera / Device Used"), "CSV contains 'Camera / Device Used' header");
    assert(freezeCsv.csv.includes("photo_url") || freezeCsv.csv.includes("s3.ap-south-1.amazonaws.com") || freezeCsv.csv.includes("unsplash"), "CSV contains photo URL");
    assert(freezeCsv.filename.includes("Freeze_the_Second_submissions_"), `Filename is '${freezeCsv.filename}'`);

    // 4. Test InnoWave CSV Generation
    console.log("\n4. Testing InnoWave CSV Generation:");
    const innowaveCsv = await generateEventCsv("innowave");
    assert(innowaveCsv.count >= 1, `InnoWave has ${innowaveCsv.count} submissions`);
    assert(innowaveCsv.csv.includes("Track / Category"), "CSV contains 'Track / Category' header");
    assert(innowaveCsv.csv.includes("Pitch Deck URL (PPTX/PDF)"), "CSV contains 'Pitch Deck URL (PPTX/PDF)' header");
    assert(innowaveCsv.csv.includes("Quantum Leap"), "CSV contains team name 'Quantum Leap'");

    // 5. Test Root Cause CSV Generation
    console.log("\n5. Testing Root Cause CSV Generation:");
    const rootcauseCsv = await generateEventCsv("rootcause");
    assert(rootcauseCsv.count >= 1, `Root Cause has ${rootcauseCsv.count} submissions`);
    assert(rootcauseCsv.csv.includes("Branch / Pull Request (PR) Link"), "CSV contains 'Branch / Pull Request (PR) Link' header");
    assert(rootcauseCsv.csv.includes("GitHub Repo / Fork Link"), "CSV contains 'GitHub Repo / Fork Link' header");
    assert(rootcauseCsv.csv.includes("DebugMasters"), "CSV contains team name 'DebugMasters'");

    // 6. Test Master All Events CSV Generation
    console.log("\n6. Testing Master All-Events Combined CSV Generation:");
    const masterCsv = await generateMasterAllEventsCsv();
    assert(masterCsv.count >= 4, `Master CSV has ${masterCsv.count} submissions total`);
    assert(masterCsv.csv.includes("Event Name"), "Master CSV has 'Event Name' column");
    assert(masterCsv.csv.includes("HackNova"), "Master CSV contains HackNova rows");
    assert(masterCsv.csv.includes("Freeze the Second"), "Master CSV contains Freeze rows");
    assert(masterCsv.csv.includes("InnoWave"), "Master CSV contains InnoWave rows");
    assert(masterCsv.csv.includes("Root Cause"), "Master CSV contains Root Cause rows");

    // 8. Test Route Protection & Admin Authentication
    console.log("\n8. Testing HTTP Route Protection (Admin Auth Required):");
    const express = require("express");
    const testApp = express();
    testApp.use(express.json());
    testApp.use("/admin", require("./Routes/adminRoutes"));
    testApp.use("/freeze", require("./Routes/FreezeRoutes"));
    testApp.use("/hacknova", require("./Routes/HackNovaRoutes"));
    testApp.use("/innowave", require("./Routes/InnowaveRoutes"));
    testApp.use("/rootcause", require("./Routes/RootCauseRoutes"));

    const testServer = await new Promise((resolve) => {
      const s = testApp.listen(4888, () => resolve(s));
    });

    try {
      // Unauthenticated attempts -> must return 401
      const unauthAdminCsv = await fetch("http://localhost:4888/admin/csv/hacknova");
      assert(unauthAdminCsv.status === 401, "Unauth /admin/csv/hacknova blocked with 401");

      const unauthDirectCsv = await fetch("http://localhost:4888/hacknova/csv");
      assert(unauthDirectCsv.status === 401, "Unauth /hacknova/csv blocked with 401");

      const unauthFreezeCsv = await fetch("http://localhost:4888/freeze/csv");
      assert(unauthFreezeCsv.status === 401, "Unauth /freeze/csv blocked with 401");

      const unauthPortal = await fetch("http://localhost:4888/admin/portal");
      const portalHtml = await unauthPortal.text();
      assert(unauthPortal.status === 200 && portalHtml.includes("id=\"loginForm\""), "Unauth /admin/portal serves SignIn page (status 200 with login form)");

      // Generate valid admin token securely for test verification
      const { generateAdminToken } = require("./utils/generateUserTokens");
      const adminToken = await generateAdminToken(1);
      assert(!!adminToken, "Admin token generated securely without hardcoded password");

      // Authenticated with Header -> must return 200
      const authHeaderCsv = await fetch("http://localhost:4888/admin/csv/hacknova", {
        headers: { Authorization: "Bearer " + adminToken },
      });
      assert(authHeaderCsv.status === 200, "Auth with Bearer token: /admin/csv/hacknova returns 200");

      // Authenticated with Query Param -> must return 200
      const authQueryCsv = await fetch("http://localhost:4888/freeze/csv?token=" + encodeURIComponent(adminToken));
      assert(authQueryCsv.status === 200, "Auth with ?token=: /freeze/csv returns 200");

      const authPortal = await fetch("http://localhost:4888/admin/portal?token=" + encodeURIComponent(adminToken));
      assert(authPortal.status === 200, "Auth with ?token=: /admin/portal returns 200");
    } finally {
      testServer.close();
    }

    console.log("\n==================================================");
    console.log(`🎉 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log("==================================================");

    process.exit(passedTests === totalTests ? 0 : 1);
  } catch (err) {
    console.error("Test run error:", err);
    process.exit(1);
  }
}

runTests();
