const client = require("../db/connect");
const { emsIds } = require("../models/master");

/**
 * Helper to resolve an event param (id or name) to a numeric EMS event ID
 */
const resolveEventId = (rawId) => {
    if (!rawId) return null;
    const clean = String(rawId).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (emsIds[clean]) {
        return emsIds[clean];
    }
    const parsed = parseInt(rawId, 10);
    return isNaN(parsed) ? null : parsed;
};

const addSubmissonEvent = async (req, res) => {
    try {
        const event_id = req.body.id;
        const event_name = req.body.name;
        const event_route = req.body.route;
        let event_status = req.body.status !== undefined ? req.body.status : true;
        if (typeof event_status === "string") {
            event_status = event_status.toLowerCase() === "true" || event_status.toLowerCase() === "yes" || event_status === "1";
        } else {
            event_status = Boolean(event_status);
        }

        if (!event_id || !event_name || !event_route) {
            return res.status(400).json({ message: "Please fill all the fields" });
        }

        const query = `INSERT INTO submission_event 
                        (event_id, event_name, event_route, event_status)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (event_id) DO UPDATE 
                        SET event_name = EXCLUDED.event_name,
                            event_route = EXCLUDED.event_route,
                            event_status = EXCLUDED.event_status
                        RETURNING *;`;
        const params = [event_id, event_name, event_route, event_status];

        const result = await client.query(query, params);
        return res.status(200).json({
            message: "Event added successfully!",
            event: result.rows[0],
        });
    } catch (error) {
        console.error("Error in addSubmissonEvent:", error);
        return res.status(500).json({ message: "Internal server error!" });
    }
};

/**
 * Update single event submission status (Active / Inactive) or route
 * PATCH /submission/update/:id
 * POST /submission/update/:id
 * Body: { status: boolean|string, route?: string }
 */
const updateSubmissionEvent = async (req, res) => {
    try {
        const rawId = req.params.id || req.body.id || req.body.event_id;
        const event_id = resolveEventId(rawId);
        const event_route = req.body.route || req.body.event_route;

        // Extract status from possible field names
        let rawStatus = req.body.status !== undefined 
            ? req.body.status 
            : (req.body.event_status !== undefined ? req.body.event_status : req.body.is_active);

        let event_status = undefined;
        if (rawStatus !== undefined && rawStatus !== null) {
            if (typeof rawStatus === "string") {
                const s = rawStatus.trim().toLowerCase();
                event_status = s === "true" || s === "yes" || s === "1" || s === "active";
            } else {
                event_status = Boolean(rawStatus);
            }
        }

        if (!event_id) {
            return res.status(400).json({ message: "Valid Event ID is required (e.g. 10, 12, 20, 21 or event name)" });
        }

        let query;
        let params;

        if (event_route !== undefined && event_status !== undefined) {
            query = `UPDATE submission_event
                     SET event_status = $1, event_route = $2
                     WHERE event_id = $3
                     RETURNING *;`;
            params = [event_status, event_route, event_id];
        } else if (event_status !== undefined) {
            query = `UPDATE submission_event
                     SET event_status = $1
                     WHERE event_id = $2
                     RETURNING *;`;
            params = [event_status, event_id];
        } else if (event_route !== undefined) {
            query = `UPDATE submission_event
                     SET event_route = $1
                     WHERE event_id = $2
                     RETURNING *;`;
            params = [event_route, event_id];
        } else {
            return res.status(400).json({ message: "No update parameters provided (provide 'status' or 'route')" });
        }

        const result = await client.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: `Event with ID ${event_id} not found in submission_event table` });
        }

        const updated = result.rows[0];
        return res.status(200).json({
            success: true,
            message: `Submissions for ${updated.event_name} are now ${updated.event_status ? "ACTIVE (Open)" : "INACTIVE (Closed)"}.`,
            event_id: updated.event_id,
            event_name: updated.event_name,
            event_status: updated.event_status,
            event_route: updated.event_route,
            event: updated,
        });
    } catch (error) {
        console.error("Error in updateSubmissionEvent:", error);
        return res.status(500).json({ message: "Internal server error: " + error.message });
    }
};

/**
 * Batch update all events submission status to Active or Inactive
 * PATCH /submission/update-all
 * POST /submission/update-all
 * Body: { status: boolean|string }
 */
const updateAllSubmissionEvents = async (req, res) => {
    try {
        let rawStatus = req.body.status !== undefined 
            ? req.body.status 
            : (req.body.event_status !== undefined ? req.body.event_status : req.body.is_active);

        let event_status = true;
        if (rawStatus !== undefined && rawStatus !== null) {
            if (typeof rawStatus === "string") {
                const s = rawStatus.trim().toLowerCase();
                event_status = s === "true" || s === "yes" || s === "1" || s === "active";
            } else {
                event_status = Boolean(rawStatus);
            }
        }

        const query = `UPDATE submission_event SET event_status = $1 RETURNING *;`;
        const result = await client.query(query, [event_status]);

        return res.status(200).json({
            success: true,
            message: `All event submissions set to ${event_status ? "ACTIVE (Accepting submissions)" : "INACTIVE (Submissions closed)"}.`,
            event_status,
            total_updated: result.rowCount,
            events: result.rows,
        });
    } catch (error) {
        console.error("Error in updateAllSubmissionEvents:", error);
        return res.status(500).json({ message: "Internal server error: " + error.message });
    }
};

const deleteSubmissionEvent = async (req, res) => {
    try {
        const rawId = req.params.id;
        const event_id = resolveEventId(rawId);

        if (!event_id) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const query = `DELETE FROM submission_event WHERE event_id = $1 RETURNING *;`;
        const params = [event_id];
        const result = await client.query(query, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.status(200).json({ message: "Event deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error!" });
    }
};

const getSubmissionEvents = async () => {
    try {
        const query = `SELECT event_id FROM submission_event WHERE event_status = true;`;
        const result = await client.query(query);
        const eventIds = result.rows.map(row => row.event_id);
        return eventIds;
    } catch (error) {
        console.error("Error fetching submission events:", error);
        throw new Error("Internal server error!");
    }
};

const getAllSubmissionEvents = async (req, res) => {
    try {
        const query = `SELECT * FROM submission_event ORDER BY event_id ASC;`;
        const result = await client.query(query);
        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error fetching all submission events:", error);
        return res.status(500).json({ message: "Internal server error!" });
    }
};

/**
 * Public endpoint to check if an event submission route is active
 * GET /submission/:route
 */
const FindStatus = async (req, res) => {
    const rawRoute = req.params.route || "";
    const cleanRoute = rawRoute.startsWith("/") ? rawRoute : "/" + rawRoute;
    const strippedRoute = rawRoute.replace(/^\//, "");

    try {
        const query = `SELECT event_status, event_name, event_id FROM submission_event WHERE event_route = $1 OR event_route = $2 OR LOWER(event_name) = LOWER($3) LIMIT 1;`;
        const params = [cleanRoute, strippedRoute, strippedRoute];
        const response = await client.query(query, params);

        if (response.rows.length > 0) {
            const isStatus = Boolean(response.rows[0].event_status);
            res.status(200).json({
                status: isStatus,
                is_active: isStatus,
                event_name: response.rows[0].event_name,
                event_id: response.rows[0].event_id,
            });
        } else {
            res.status(404).json({ message: "Event not found", status: false, is_active: false });
        }
    } catch (error) {
        console.error("Error in FindStatus:", error);
        res.status(500).json({ message: "Internal server error!" });
    }
};

module.exports = {
    addSubmissonEvent,
    updateSubmissionEvent,
    updateAllSubmissionEvents,
    deleteSubmissionEvent,
    getSubmissionEvents,
    getAllSubmissionEvents,
    FindStatus,
};