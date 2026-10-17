const bcrypt = require('bcryptjs');
const client = require("../db/connect");
const {generateAdminToken}   = require("../utils/generateUserTokens");
const {Parser} = require('json2csv');
const path = require('path');
const fs = require('fs');   

const signUpAdmin = async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const query = `INSERT INTO Admin (username, password, created_at, updated_at) VALUES ($1, $2, $3, $4) RETURNING id, username, created_at, updated_at`;
        const values = [req.body.username, hashedPassword, new Date(), new Date()];
        const result = await client.query(query, values);
        const admin_id=result.rows[0].id;
        console.log(admin_id);
        const token = await generateAdminToken(admin_id);
        res.send({
            admin: result.rows[0],
            token
        })
    } catch (e) {
        console.log(e);
        const duplicateError = e.message.split(" ").pop().replaceAll('"', '');
        if (duplicateError === "admin_username_key") {
            return res.status(409).json({ error: "Admin already exists" })
        }
        res.status(500).send({
            error: "Internal Server Error" 
        })
    }
};

const signInAdmin = async (req, res) => {
    try {
        const query = `select * from Admin where username = $1`;
        const values = [req.body.username];
        const result = await client.query(query, values)
        if (result.rowCount === 0) {
            return res.status(400).send({
                error: "Admin Does not exist"
            })
        }
        else {
            const auth = await bcrypt.compare(req.body.password, result.rows[0].password);
            if (auth) {
                const token = await generateAdminToken(result.rows[0].id);
                const admin = result.rows[0];
                delete admin.password;
                res.send({
                    admin,
                    token
                })
            }
            else {
                return res.status(400).send({
                    error: "Admin Credentials does not match"
                })
            }
        }
    } catch (e) {
        res.status(500).send({
            error: "Internal Server Error"
        })
    }
}

const getAdmin = async (req, res) => {
    res.send({ admin: req.admin });
}

 const logOutAdmin = async (req, res) => {
    try {
        const query = "delete from admin_token where token = $1";
        const params = [req.token];
        const data = await client.query(query, params);
        if (data.rowCount === 1) {
            return res.status(200).json({ success: "successfully logged out" });
        }
        else {
            return res.status(500).json({ error: "Unable to log out" });
        }
    }
    catch (e) {
        res.status(500).send({
            error: "Internal Server Error"
        })
    } 
}
// const GetSubmissionFromEvent=async(req,res)=>{
//     try {
//         const name=req.params.name;
//         if(!name){
//             res.status(400).json({message:"name not found !!!"});
//         }
//         const query=`select ${name}.id,${name}.`
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({message:"internal server error !!"})
//     }
// }
const {
    generateEventCsv,
    generateMasterAllEventsCsv,
    getEventsSummary,
    EVENT_SPECS,
} = require("../utils/csvExporter");

/**
 * Download Event-wise CSV
 * GET /admin/csv/:event
 * Supports: 'hacknova', 'freeze', 'innowave', 'rootcause', or 'all', or event IDs '20', '10', '12', '21'
 */
const getcsv = async (req, res) => {
    try {
        const eventParam = req.params.event || req.query.event;

        if (!eventParam) {
            return res.status(400).json({
                error: "Event parameter is required. E.g. /admin/csv/hacknova, /admin/csv/freeze, /admin/csv/innowave, /admin/csv/rootcause, or /admin/csv/all",
            });
        }

        if (eventParam.toLowerCase() === "all" || eventParam.toLowerCase() === "master") {
            const result = await generateMasterAllEventsCsv();
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
            return res.status(200).send(result.csv);
        }

        const result = await generateEventCsv(eventParam);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        return res.status(200).send(result.csv);
    } catch (e) {
        console.error("Error generating CSV:", e);
        const availableEvents = Object.keys(EVENT_SPECS).map((k) => ({
            key: k,
            name: EVENT_SPECS[k].eventName,
            emsId: EVENT_SPECS[k].emsId,
            downloadPath: `/admin/csv/${k}`,
        }));

        return res.status(400).json({
            error: e.message || "Failed to generate CSV",
            available_events: availableEvents,
            all_events_export: "/admin/csv/all",
        });
    }
};

/**
 * Download Master CSV of all events combined
 * GET /admin/csv
 * GET /admin/submissions/csv
 */
const getAllCsv = async (req, res) => {
    try {
        const result = await generateMasterAllEventsCsv();
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        return res.status(200).send(result.csv);
    } catch (e) {
        console.error("Error generating Master CSV:", e);
        return res.status(500).json({ error: "Internal Server Error: " + e.message });
    }
};

/**
 * Get JSON summary of events with submission counts and download paths
 * GET /admin/csv/summary
 */
const getEventSummaryList = async (req, res) => {
    try {
        const summary = await getEventsSummary();
        return res.status(200).json({
            success: true,
            totalEvents: summary.length,
            events: summary,
            allEventsDownload: "/admin/csv/all",
        });
    } catch (e) {
        console.error("Error getting event summary:", e);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

/**
 * Visual Web Portal for One-Click CSV Downloads with integrated Sign In
 * GET /admin/portal
 */
const getCsvPortal = async (req, res) => {
    try {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pulzion '26 - Admin Submissions Portal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0a0e17;
            --surface: #111827;
            --surface-hover: #1f2937;
            --border: #374151;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --accent: #10b981;
            --danger: #ef4444;
            --text: #f9fafb;
            --text-muted: #9ca3af;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            padding: 2.5rem 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            width: 100%;
            max-width: 1000px;
        }
        header {
            margin-bottom: 2.5rem;
            text-align: center;
            position: relative;
        }
        .tagline {
            display: inline-block;
            background: rgba(59, 130, 246, 0.12);
            color: var(--primary);
            padding: 0.35rem 0.9rem;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }
        h1 {
            font-size: 2.4rem;
            font-weight: 700;
            background: linear-gradient(135deg, #ffffff 0%, #9ca3af 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        .user-bar {
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .user-pill {
            background: rgba(255, 255, 255, 0.08);
            padding: 0.35rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            color: #d1d5db;
        }
        .btn-signout {
            background: rgba(239, 68, 68, 0.15);
            color: var(--danger);
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 0.35rem 0.85rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-signout:hover {
            background: var(--danger);
            color: #fff;
        }

        /* Login Card */
        .login-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 400px;
        }
        .login-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 2.5rem;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.3s ease;
        }
        .login-card h2 {
            font-size: 1.6rem;
            margin-bottom: 0.5rem;
            text-align: center;
        }
        .login-card p {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 1.75rem;
            text-align: center;
        }
        .form-group {
            margin-bottom: 1.25rem;
        }
        .form-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 0.4rem;
            color: #d1d5db;
        }
        .form-group input {
            width: 100%;
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            color: #fff;
            font-family: inherit;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .form-group input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        .btn-login {
            width: 100%;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #fff;
            border: none;
            padding: 0.85rem;
            border-radius: 8px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
            transition: all 0.2s;
            margin-top: 0.5rem;
        }
        .btn-login:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }
        .btn-login:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .error-banner {
            display: none;
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #fca5a5;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            margin-bottom: 1.25rem;
        }

        /* Dashboard View */
        .dashboard-content {
            display: none;
            animation: fadeIn 0.3s ease;
        }
        .stats-bar {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.25rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2.5rem;
            flex-wrap: wrap;
            gap: 1rem;
        }
        .stat-item {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
        }
        .stat-val {
            font-size: 1.8rem;
            font-weight: 700;
            color: var(--accent);
        }
        .stat-label {
            color: var(--text-muted);
            font-size: 0.95rem;
        }
        .btn-master {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #fff;
            text-decoration: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .btn-master:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 14px;
            padding: 1.5rem;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
        }
        .card:hover {
            border-color: #4b5563;
            transform: translateY(-2px);
            background: var(--surface-hover);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        .badge {
            background: rgba(255, 255, 255, 0.08);
            color: #e5e7eb;
            padding: 0.25rem 0.6rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .count {
            color: var(--accent);
            font-weight: 600;
            font-size: 0.85rem;
        }
        .card h3 {
            font-size: 1.4rem;
            margin-bottom: 0.5rem;
        }
        .table-name {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: 1.5rem;
        }
        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: monospace;
            color: #60a5fa;
        }
        .actions {
            margin-top: auto;
            display: flex;
            gap: 0.75rem;
        }
        .btn {
            flex: 1;
            text-align: center;
            text-decoration: none;
            padding: 0.65rem 1rem;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        .btn-primary {
            background: #2563eb;
            color: #fff;
        }
        .btn-primary:hover {
            background: #1d4ed8;
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #d1d5db;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }
        footer {
            margin-top: 3.5rem;
            text-align: center;
            font-size: 0.85rem;
            color: var(--text-muted);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div id="userHeaderBar" class="user-bar" style="display: none;">
                <span id="usernameDisplay" class="user-pill">Admin</span>
                <button id="signoutBtn" class="btn-signout">Sign Out</button>
            </div>
            <span class="tagline">PICT ACM Student Chapter</span>
            <h1>Pulzion '26 Submissions Portal</h1>
            <p id="portalSubheading" style="color: var(--text-muted);">Please sign in with your admin credentials to access event downloads.</p>
        </header>

        <!-- 1. SIGN IN FORM -->
        <div id="loginSection" class="login-wrapper">
            <div class="login-card">
                <h2>Admin Sign In</h2>
                <p>Enter your credentials to download event submissions</p>
                
                <div id="loginError" class="error-banner"></div>

                <form id="loginForm">
                    <div class="form-group">
                        <label for="usernameInput">Username</label>
                        <input type="text" id="usernameInput" placeholder="e.g. submissionbackend" required autocomplete="username">
                    </div>
                    <div class="form-group">
                        <label for="passwordInput">Password</label>
                        <input type="password" id="passwordInput" placeholder="Enter admin password" required autocomplete="current-password">
                    </div>
                    <button type="submit" id="submitLoginBtn" class="btn-login">Sign In to Admin Portal</button>
                </form>
            </div>
        </div>

        <!-- 2. DASHBOARD (Revealed on Auth) -->
        <div id="dashboardSection" class="dashboard-content">
            <div class="stats-bar">
                <div class="stat-item">
                    <span id="totalCountDisplay" class="stat-val">0</span>
                    <span class="stat-label">Total Submissions Across All Events</span>
                </div>
                <a id="masterDownloadBtn" href="/admin/csv/all" class="btn-master" download>📊 Download Master CSV (All Events)</a>
            </div>

            <div id="eventCardsGrid" class="grid">
                <!-- Dynamically populated -->
            </div>
        </div>

        <footer>
            Pulzion '26 Event Management Backend &bull; PICT ACM Student Chapter &bull; Export format: UTF-8 CSV with Excel BOM
        </footer>
    </div>

    <script>
        const TOKEN_KEY = "pulzion_admin_token";
        const ADMIN_INFO_KEY = "pulzion_admin_user";

        const loginSection = document.getElementById("loginSection");
        const dashboardSection = document.getElementById("dashboardSection");
        const userHeaderBar = document.getElementById("userHeaderBar");
        const usernameDisplay = document.getElementById("usernameDisplay");
        const portalSubheading = document.getElementById("portalSubheading");
        const loginError = document.getElementById("loginError");
        const loginForm = document.getElementById("loginForm");
        const submitLoginBtn = document.getElementById("submitLoginBtn");
        const signoutBtn = document.getElementById("signoutBtn");

        const totalCountDisplay = document.getElementById("totalCountDisplay");
        const masterDownloadBtn = document.getElementById("masterDownloadBtn");
        const eventCardsGrid = document.getElementById("eventCardsGrid");

        // Check for existing token in URL or localStorage
        async function init() {
            const urlParams = new URLSearchParams(window.location.search);
            const urlToken = urlParams.get("token") || urlParams.get("admin_token");

            if (urlToken) {
                localStorage.setItem(TOKEN_KEY, urlToken);
            }

            const token = localStorage.getItem(TOKEN_KEY);
            if (token) {
                await loadDashboard(token);
            } else {
                showLoginView();
            }
        }

        function showLoginView() {
            loginSection.style.display = "flex";
            dashboardSection.style.display = "none";
            userHeaderBar.style.display = "none";
            portalSubheading.innerText = "Please sign in with your admin credentials to access event downloads.";
        }

        async function loadDashboard(token, adminInfo) {
            try {
                // Fetch live summary with admin token
                const res = await fetch("/admin/csv/summary?token=" + encodeURIComponent(token));
                if (!res.ok) {
                    throw new Error("Session expired or unauthorized");
                }
                const data = await res.json();

                // Successful authentication: display dashboard
                loginSection.style.display = "none";
                dashboardSection.style.display = "block";
                userHeaderBar.style.display = "flex";

                const username = adminInfo?.username || localStorage.getItem(ADMIN_INFO_KEY) || "Admin";
                usernameDisplay.innerText = "Logged in: " + username;
                portalSubheading.innerText = "One-click CSV downloads with full participant contact information and clickable links.";

                const totalSubmissions = data.events.reduce((acc, curr) => acc + curr.submissionsCount, 0);
                totalCountDisplay.innerText = totalSubmissions;
                masterDownloadBtn.href = "/admin/csv/all?token=" + encodeURIComponent(token);

                // Render event cards
                eventCardsGrid.innerHTML = data.events.map(ev => \`
                    <div class="card">
                        <div class="card-header">
                            <span class="badge">EMS ID: \${ev.emsId}</span>
                            <span class="count">\${ev.submissionsCount} submissions</span>
                        </div>
                        <h3>\${ev.name}</h3>
                        <p class="table-name">Database Table: <code>\${ev.table}</code></p>
                        <div class="actions">
                            <a href="\${ev.downloadPath}?token=\${encodeURIComponent(token)}" class="btn btn-primary" download>📥 Download CSV</a>
                            <a href="\${ev.directPath}?token=\${encodeURIComponent(token)}" class="btn btn-secondary" download>Direct Route</a>
                        </div>
                    </div>
                \`).join("");

            } catch (err) {
                console.warn("Auth check failed:", err.message);
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(ADMIN_INFO_KEY);
                showLoginView();
            }
        }

        // Handle Login Submission
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            loginError.style.display = "none";
            submitLoginBtn.disabled = true;
            submitLoginBtn.innerText = "Signing in...";

            const username = document.getElementById("usernameInput").value.trim();
            const password = document.getElementById("passwordInput").value;

            try {
                const res = await fetch("/admin/signin", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "Login failed. Please check your credentials.");
                }

                localStorage.setItem(TOKEN_KEY, data.token);
                localStorage.setItem(ADMIN_INFO_KEY, data.admin.username);
                await loadDashboard(data.token, data.admin);

            } catch (err) {
                loginError.innerText = err.message;
                loginError.style.display = "block";
            } finally {
                submitLoginBtn.disabled = false;
                submitLoginBtn.innerText = "Sign In to Admin Portal";
            }
        });

        // Handle Sign Out
        signoutBtn.addEventListener("click", () => {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(ADMIN_INFO_KEY);
            // Remove token from URL without refreshing
            const url = new URL(window.location);
            url.searchParams.delete("token");
            url.searchParams.delete("admin_token");
            window.history.replaceState({}, document.title, url.pathname);
            showLoginView();
        });

        init();
    </script>
</body>
</html>
        `;

        res.setHeader("Content-Type", "text/html");
        return res.status(200).send(html);
    } catch (e) {
        console.error("Error loading CSV portal:", e);
        return res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    signInAdmin,
    signUpAdmin,
    getAdmin,
    logOutAdmin,
    getcsv,
    getAllCsv,
    getEventSummaryList,
    getCsvPortal,
};
   