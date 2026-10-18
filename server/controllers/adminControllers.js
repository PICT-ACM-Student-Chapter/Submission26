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
                error: "Event parameter is required. E.g. /admin/csv/hacknova, /admin/csv/hacknova-teams, /admin/csv/freeze, /admin/csv/innowave, /admin/csv/rootcause, or /admin/csv/all",
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
    <title>Pulzion '26 - Admin Submissions & Control Portal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #090d16;
            --surface: #111827;
            --surface-hover: #172133;
            --surface-card: rgba(17, 24, 39, 0.88);
            --border: #1f293d;
            --border-hover: #374151;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --accent: #10b981;
            --accent-glow: rgba(16, 185, 129, 0.25);
            --danger: #ef4444;
            --danger-glow: rgba(239, 68, 68, 0.25);
            --warning: #f59e0b;
            --text: #f9fafb;
            --text-muted: #9ca3af;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            background-image: 
                radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.08) 0%, transparent 40%),
                radial-gradient(circle at 85% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 40%);
            color: var(--text);
            min-height: 100vh;
            padding: 2.5rem 1.5rem 4rem 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            width: 100%;
            max-width: 1050px;
        }
        header {
            margin-bottom: 2.5rem;
            text-align: center;
            position: relative;
        }
        .tagline {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            background: rgba(59, 130, 246, 0.12);
            border: 1px solid rgba(59, 130, 246, 0.25);
            color: #60a5fa;
            padding: 0.35rem 0.95rem;
            border-radius: 9999px;
            font-size: 0.82rem;
            font-weight: 600;
            margin-bottom: 0.85rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }
        h1 {
            font-size: 2.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #94a3b8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.6rem;
            letter-spacing: -0.02em;
        }
        .user-bar {
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .user-pill {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            padding: 0.4rem 0.85rem;
            border-radius: 20px;
            font-size: 0.85rem;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        .user-pill-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--accent);
            box-shadow: 0 0 8px var(--accent);
        }
        .btn-signout {
            background: rgba(239, 68, 68, 0.15);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 0.4rem 0.9rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-signout:hover {
            background: var(--danger);
            color: #fff;
            box-shadow: 0 0 12px var(--danger-glow);
        }

        /* Login Card */
        .login-wrapper {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 400px;
        }
        .login-card {
            background: var(--surface-card);
            border: 1px solid var(--border);
            backdrop-filter: blur(12px);
            border-radius: 18px;
            padding: 2.75rem;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
            animation: fadeIn 0.3s ease;
        }
        .login-card h2 {
            font-size: 1.7rem;
            font-weight: 700;
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
            margin-bottom: 0.45rem;
            color: #d1d5db;
        }
        .form-group input {
            width: 100%;
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 0.8rem 1rem;
            color: #fff;
            font-family: inherit;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.2s;
        }
        .form-group input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
        }
        .btn-login {
            width: 100%;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #fff;
            border: none;
            padding: 0.9rem;
            border-radius: 10px;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
            transition: all 0.2s;
            margin-top: 0.5rem;
        }
        .btn-login:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
        }
        .error-banner {
            display: none;
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #fca5a5;
            padding: 0.8rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            margin-bottom: 1.25rem;
        }

        /* Dashboard View */
        .dashboard-content {
            display: none;
            animation: fadeIn 0.3s ease;
        }

        /* Master Control Bar */
        .master-panel {
            background: var(--surface-card);
            border: 1px solid var(--border);
            backdrop-filter: blur(12px);
            border-radius: 16px;
            padding: 1.5rem 2rem;
            margin-bottom: 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1.5rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }
        .metrics-group {
            display: flex;
            align-items: center;
            gap: 2rem;
            flex-wrap: wrap;
        }
        .metric-item {
            display: flex;
            flex-direction: column;
        }
        .metric-val {
            font-size: 2rem;
            font-weight: 800;
            color: #fff;
            line-height: 1.1;
        }
        .metric-val.active-count {
            color: var(--accent);
        }
        .metric-label {
            color: var(--text-muted);
            font-size: 0.82rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 0.25rem;
        }
        .master-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
        }
        .btn-global {
            padding: 0.65rem 1.1rem;
            border-radius: 9px;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
        }
        .btn-open-all {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border-color: rgba(16, 185, 129, 0.35);
        }
        .btn-open-all:hover {
            background: var(--accent);
            color: #fff;
            box-shadow: 0 4px 14px var(--accent-glow);
        }
        .btn-close-all {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.35);
        }
        .btn-close-all:hover {
            background: var(--danger);
            color: #fff;
            box-shadow: 0 4px 14px var(--danger-glow);
        }
        .btn-master {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #fff;
            text-decoration: none;
            padding: 0.7rem 1.3rem;
            border-radius: 9px;
            font-weight: 600;
            font-size: 0.9rem;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
        .btn-master:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
        }

        /* Event Cards Grid */
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1.5rem;
        }
        .card {
            background: var(--surface-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1.6rem;
            transition: all 0.25s ease;
            display: flex;
            flex-direction: column;
            position: relative;
            backdrop-filter: blur(8px);
        }
        .card.is-active {
            border-color: rgba(16, 185, 129, 0.35);
        }
        .card.is-active:hover {
            border-color: rgba(16, 185, 129, 0.6);
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(16, 185, 129, 0.1);
        }
        .card.is-closed {
            border-color: rgba(239, 68, 68, 0.35);
            background: rgba(24, 18, 24, 0.75);
        }
        .card.is-closed:hover {
            border-color: rgba(239, 68, 68, 0.6);
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(239, 68, 68, 0.1);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }
        .badge {
            background: rgba(255, 255, 255, 0.08);
            color: #e5e7eb;
            padding: 0.3rem 0.65rem;
            border-radius: 7px;
            font-size: 0.78rem;
            font-weight: 600;
            font-family: 'JetBrains Mono', monospace;
        }
        .count-pill {
            background: rgba(59, 130, 246, 0.12);
            color: #60a5fa;
            border: 1px solid rgba(59, 130, 246, 0.25);
            padding: 0.3rem 0.7rem;
            border-radius: 7px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .card h3 {
            font-size: 1.45rem;
            font-weight: 700;
            margin-bottom: 0.35rem;
            color: #fff;
        }
        .table-name {
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-bottom: 1.25rem;
        }
        code {
            background: rgba(0, 0, 0, 0.4);
            padding: 0.2rem 0.45rem;
            border-radius: 5px;
            font-family: 'JetBrains Mono', monospace;
            color: #93c5fd;
            font-size: 0.82rem;
        }

        /* Submission Active Control Section */
        .status-control-box {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 12px;
            padding: 1rem 1.1rem;
            margin-bottom: 1.4rem;
        }
        .status-control-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }
        .control-title {
            font-size: 0.82rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #cbd5e1;
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.78rem;
            font-weight: 700;
            padding: 0.25rem 0.65rem;
            border-radius: 6px;
            letter-spacing: 0.03em;
        }
        .status-badge.active {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .status-badge.closed {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
            border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .pulse-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
            animation: pulse 2s infinite;
        }
        .closed-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #ef4444;
        }

        /* Segmented YES / NO Toggle Switch */
        .segmented-switch {
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 4px;
            gap: 4px;
        }
        .seg-btn {
            background: transparent;
            border: none;
            padding: 0.55rem 0.75rem;
            border-radius: 7px;
            font-family: inherit;
            font-size: 0.88rem;
            font-weight: 600;
            color: #9ca3af;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
        }
        .seg-btn:hover:not(.active):not(:disabled) {
            color: #fff;
            background: rgba(255, 255, 255, 0.06);
        }
        .seg-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .seg-btn.active.seg-yes {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: #fff;
            font-weight: 700;
            box-shadow: 0 3px 10px rgba(16, 185, 129, 0.35);
        }
        .seg-btn.active.seg-no {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: #fff;
            font-weight: 700;
            box-shadow: 0 3px 10px rgba(239, 68, 68, 0.35);
        }

        .submission-warning-msg {
            margin-top: 0.65rem;
            font-size: 0.78rem;
            color: #fca5a5;
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            padding: 0.4rem 0.65rem;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 0.35rem;
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
            padding: 0.68rem 1rem;
            border-radius: 9px;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
        }
        .btn-primary {
            background: #2563eb;
            color: #fff;
        }
        .btn-primary:hover {
            background: #1d4ed8;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #d1d5db;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
            color: #fff;
        }

        /* Toast notifications */
        .toast-container {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            pointer-events: none;
        }
        .toast {
            pointer-events: auto;
            background: #1e293b;
            color: #fff;
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 0.9rem 1.25rem;
            border-radius: 10px;
            font-size: 0.9rem;
            font-weight: 500;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            gap: 0.65rem;
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            max-width: 380px;
        }
        .toast.toast-success {
            border-color: rgba(16, 185, 129, 0.4);
            background: #064e3b;
        }
        .toast.toast-warning {
            border-color: rgba(239, 68, 68, 0.4);
            background: #450a0a;
        }
        .toast.toast-error {
            border-color: rgba(239, 68, 68, 0.5);
            background: #7f1d1d;
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
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div id="userHeaderBar" class="user-bar" style="display: none;">
                <span id="usernameDisplay" class="user-pill">
                    <span class="user-pill-dot"></span>
                    <span id="usernameText">Admin</span>
                </span>
                <button id="signoutBtn" class="btn-signout">Sign Out</button>
            </div>
            <span class="tagline">✦ PICT ACM Student Chapter &bull; Pulzion '26</span>
            <h1>Pulzion '26 Admin Submissions Portal</h1>
            <p id="portalSubheading" style="color: var(--text-muted);">Sign in to manage live submission acceptance and download participant reports.</p>
        </header>

        <!-- 1. SIGN IN FORM -->
        <div id="loginSection" class="login-wrapper">
            <div class="login-card">
                <h2>Admin Sign In</h2>
                <p>Authenticate to toggle event submission status and download data</p>
                
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
            <!-- Master Control & Summary Bar -->
            <div class="master-panel">
                <div class="metrics-group">
                    <div class="metric-item">
                        <span id="totalCountDisplay" class="metric-val">0</span>
                        <span class="metric-label">Total Submissions</span>
                    </div>
                    <div class="metric-item">
                        <span id="activePortalsDisplay" class="metric-val active-count">0 / 0</span>
                        <span class="metric-label">Active Portals</span>
                    </div>
                </div>

                <div class="master-actions">
                    <button id="openAllBtn" class="btn-global btn-open-all" title="Enable submissions for all events">
                        <span>🟢</span> Open All (YES)
                    </button>
                    <button id="closeAllBtn" class="btn-global btn-close-all" title="Disable submissions for all events">
                        <span>🔴</span> Close All (NO)
                    </button>
                    <a id="hacknovaTeamsDownloadBtn" href="/admin/csv/hacknova-teams" class="btn-global" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); text-decoration: none;" download>
                        <span>👥</span> HackNova Squads CSV
                    </a>
                    <a id="masterDownloadBtn" href="/admin/csv/all" class="btn-master" download>
                        <span>📊</span> Master CSV (All Events)
                    </a>
                </div>
            </div>

            <!-- Event Cards Grid with Individual Yes/No Submission Toggles -->
            <div id="eventCardsGrid" class="grid">
                <!-- Dynamically populated -->
            </div>
        </div>

        <footer>
            Pulzion '26 Event Management Backend &bull; PICT ACM Student Chapter &bull; Export format: UTF-8 CSV with Excel BOM
        </footer>
    </div>

    <!-- Toast Notification Container -->
    <div id="toastContainer" class="toast-container"></div>

    <script>
        const TOKEN_KEY = "pulzion_admin_token";
        const ADMIN_INFO_KEY = "pulzion_admin_user";

        const loginSection = document.getElementById("loginSection");
        const dashboardSection = document.getElementById("dashboardSection");
        const userHeaderBar = document.getElementById("userHeaderBar");
        const usernameText = document.getElementById("usernameText");
        const portalSubheading = document.getElementById("portalSubheading");
        const loginError = document.getElementById("loginError");
        const loginForm = document.getElementById("loginForm");
        const submitLoginBtn = document.getElementById("submitLoginBtn");
        const signoutBtn = document.getElementById("signoutBtn");

        const totalCountDisplay = document.getElementById("totalCountDisplay");
        const activePortalsDisplay = document.getElementById("activePortalsDisplay");
        const masterDownloadBtn = document.getElementById("masterDownloadBtn");
        const eventCardsGrid = document.getElementById("eventCardsGrid");
        const openAllBtn = document.getElementById("openAllBtn");
        const closeAllBtn = document.getElementById("closeAllBtn");
        const toastContainer = document.getElementById("toastContainer");

        let currentEvents = [];

        function showToast(message, type = "info") {
            const toast = document.createElement("div");
            toast.className = "toast " + (type === "success" ? "toast-success" : (type === "warning" ? "toast-warning" : (type === "error" ? "toast-error" : "")));
            const icon = type === "success" ? "✓" : (type === "warning" ? "⚠️" : (type === "error" ? "✕" : "ℹ️"));
            toast.innerHTML = "<span>" + icon + "</span><span>" + message + "</span>";
            toastContainer.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = "0";
                toast.style.transform = "translateY(10px)";
                toast.style.transition = "all 0.3s ease";
                setTimeout(() => toast.remove(), 300);
            }, 3800);
        }

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
            portalSubheading.innerText = "Please sign in with your admin credentials to manage submissions and downloads.";
        }

        async function loadDashboard(token, adminInfo) {
            try {
                const res = await fetch("/admin/csv/summary?token=" + encodeURIComponent(token));
                if (!res.ok) {
                    throw new Error("Session expired or unauthorized");
                }
                const data = await res.json();

                loginSection.style.display = "none";
                dashboardSection.style.display = "block";
                userHeaderBar.style.display = "flex";

                const username = adminInfo?.username || localStorage.getItem(ADMIN_INFO_KEY) || "Admin";
                usernameText.innerText = username;
                portalSubheading.innerText = "Control submission active status (YES/NO) and export participant data.";

                currentEvents = data.events || [];
                renderDashboard(token);

            } catch (err) {
                console.warn("Auth check failed:", err.message);
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(ADMIN_INFO_KEY);
                showLoginView();
            }
        }

        function renderDashboard(token) {
            const totalSubmissions = currentEvents.reduce((acc, curr) => acc + (curr.submissionsCount || 0), 0);
            totalCountDisplay.innerText = totalSubmissions;

            const activeEventsCount = currentEvents.filter(ev => ev.isSubmissionActive).length;
            activePortalsDisplay.innerText = activeEventsCount + " / " + currentEvents.length + " Open";
            if (activeEventsCount === currentEvents.length) {
                activePortalsDisplay.className = "metric-val active-count";
            } else if (activeEventsCount === 0) {
                activePortalsDisplay.className = "metric-val";
                activePortalsDisplay.style.color = "var(--danger)";
            } else {
                activePortalsDisplay.className = "metric-val";
                activePortalsDisplay.style.color = "var(--warning)";
            }

            const hacknovaTeamsDownloadBtn = document.getElementById("hacknovaTeamsDownloadBtn");
            if (hacknovaTeamsDownloadBtn) {
                hacknovaTeamsDownloadBtn.href = "/admin/csv/hacknova-teams?token=" + encodeURIComponent(token);
            }
            masterDownloadBtn.href = "/admin/csv/all?token=" + encodeURIComponent(token);

            eventCardsGrid.innerHTML = currentEvents.map(ev => {
                const isActive = Boolean(ev.isSubmissionActive);
                const cardKey = ev.key || ev.emsId;
                const displayId = ev.displayEmsId || ev.emsId;
                return \`
                    <div class="card \${isActive ? 'is-active' : 'is-closed'}" id="card-\${cardKey}">
                        <div class="card-header">
                            <span class="badge">EMS ID: \${displayId}</span>
                            <span class="count-pill">\${ev.submissionsCount} submissions</span>
                        </div>
                        <h3>\${ev.name}</h3>
                        <p class="table-name">Database Table: <code>\${ev.table}</code> &bull; Route: <code>\${ev.eventRoute || '/' + ev.key}</code></p>
                        
                        <!-- Submission Active or Not Control -->
                        <div class="status-control-box">
                            <div class="status-control-header">
                                <span class="control-title">Submission Active?</span>
                                \${isActive 
                                    ? '<span class="status-badge active"><span class="pulse-dot"></span> ACTIVE (Open)</span>'
                                    : '<span class="status-badge closed"><span class="closed-dot"></span> CLOSED (Rejecting)</span>'
                                }
                            </div>

                            <div class="segmented-switch">
                                <button type="button" 
                                    class="seg-btn seg-yes \${isActive ? 'active' : ''}" 
                                    onclick="setEventSubmissionStatus(\${ev.emsId}, true, '\${ev.name}', '\${cardKey}')"
                                    id="btn-yes-\${cardKey}">
                                    <span>✓</span> YES (Active)
                                </button>
                                <button type="button" 
                                    class="seg-btn seg-no \${!isActive ? 'active' : ''}" 
                                    onclick="setEventSubmissionStatus(\${ev.emsId}, false, '\${ev.name}', '\${cardKey}')"
                                    id="btn-no-\${cardKey}">
                                    <span>✕</span> NO (Closed)
                                </button>
                            </div>

                            \${!isActive 
                                ? '<div class="submission-warning-msg"><span>⛔</span> Submissions are closed. New entries will NOT be accepted.</div>'
                                : ''
                            }
                        </div>

                        <div class="actions">
                            <a href="\${ev.downloadPath}?token=\${encodeURIComponent(token)}" class="btn btn-primary" download>📥 Download CSV</a>
                            <a href="\${ev.directPath}?token=\${encodeURIComponent(token)}" class="btn btn-secondary" download>Direct Route</a>
                        </div>
                    </div>
                \`;
            }).join("");
        }

        // Toggle Single Event Submission Status (YES / NO)
        window.setEventSubmissionStatus = async function(eventId, newStatus, eventName, eventKey) {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) {
                showToast("Please sign in first.", "error");
                showLoginView();
                return;
            }

            const btnKey = eventKey || eventId;
            const btnYes = document.getElementById("btn-yes-" + btnKey);
            const btnNo = document.getElementById("btn-no-" + btnKey);
            if (btnYes) btnYes.disabled = true;
            if (btnNo) btnNo.disabled = true;

            try {
                const res = await fetch("/admin/submission-status/" + eventId + "?token=" + encodeURIComponent(token), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || data.error || "Failed to update submission status");
                }

                // Update in local state ONLY for this clicked event
                const ev = currentEvents.find(e => (eventKey && e.key === eventKey) || e.emsId === eventId);
                if (ev) {
                    ev.isSubmissionActive = newStatus;
                    ev.eventStatus = newStatus;
                }

                renderDashboard(token);

                if (newStatus) {
                    showToast("✓ " + eventName + ": Status is now ACTIVE (Open)!", "success");
                } else {
                    showToast("🛑 " + eventName + ": Status is now CLOSED.", "warning");
                }

            } catch (err) {
                console.error("Error setting submission status:", err);
                showToast("Error updating status: " + err.message, "error");
                if (btnYes) btnYes.disabled = false;
                if (btnNo) btnNo.disabled = false;
            }
        };

        // Master Toggle: Open or Close All Events
        async function setAllEventsSubmissionStatus(newStatus) {
            const token = localStorage.getItem(TOKEN_KEY);
            if (!token) return showLoginView();

            const actionWord = newStatus ? "OPEN (Accept submissions)" : "CLOSE (Reject all submissions)";
            const confirmed = confirm("Are you sure you want to " + actionWord + " for ALL 4 events?");
            if (!confirmed) return;

            openAllBtn.disabled = true;
            closeAllBtn.disabled = true;

            try {
                const res = await fetch("/admin/submission-status/toggle-all?token=" + encodeURIComponent(token), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || data.error || "Failed to update all events");
                }

                currentEvents.forEach(ev => {
                    ev.isSubmissionActive = newStatus;
                    ev.eventStatus = newStatus;
                });

                renderDashboard(token);

                if (newStatus) {
                    showToast("✓ ALL events are now ACTIVE (Open for submissions)!", "success");
                } else {
                    showToast("🛑 ALL events are now CLOSED. No submissions will be accepted.", "warning");
                }

            } catch (err) {
                console.error("Error setting all submission status:", err);
                showToast("Error: " + err.message, "error");
            } finally {
                openAllBtn.disabled = false;
                closeAllBtn.disabled = false;
            }
        }

        openAllBtn.addEventListener("click", () => setAllEventsSubmissionStatus(true));
        closeAllBtn.addEventListener("click", () => setAllEventsSubmissionStatus(false));

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
                showToast("Welcome back, " + data.admin.username + "!", "success");

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
            const url = new URL(window.location);
            url.searchParams.delete("token");
            url.searchParams.delete("admin_token");
            window.history.replaceState({}, document.title, url.pathname);
            showLoginView();
            showToast("Signed out successfully.", "info");
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
   