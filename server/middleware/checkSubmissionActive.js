const client = require("../db/connect");

/**
 * Middleware factory to ensure submissions are currently active for the given event ID.
 * If submissions are closed (event_status is false), immediately blocks the request with 403 Forbidden.
 *
 * @param {number} eventId - The EMS Event ID (e.g., 10, 12, 20, 21)
 */
const checkSubmissionActive = (eventId) => {
  return async (req, res, next) => {
    try {
      const result = await client.query(
        "SELECT event_status, event_name FROM submission_event WHERE event_id = $1 LIMIT 1",
        [eventId]
      );

      // Fail-closed: If not found in submission_event OR event_status is false / not true
      if (result.rowCount === 0 || result.rows[0].event_status !== true) {
        const eventName = result.rows[0]?.event_name || "this event";
        return res.status(403).json({
          error: `Submissions for ${eventName} are currently closed.`,
          message: `Submissions for ${eventName} are not active. No submissions will be accepted or stored in the database.`,
          event_status: false,
          event_id: eventId,
        });
      }

      next();
    } catch (err) {
      console.error(`Error checking submission active status for event ${eventId}:`, err);
      return res.status(500).json({ error: "Failed to verify event submission status." });
    }
  };
};

/**
 * Standalone asynchronous check for controller functions
 * @param {number} eventId
 * @returns {Promise<{ active: boolean, eventName: string }>}
 */
const isSubmissionActive = async (eventId) => {
  try {
    const result = await client.query(
      "SELECT event_status, event_name FROM submission_event WHERE event_id = $1 LIMIT 1",
      [eventId]
    );
    if (result.rowCount === 0) {
      return { active: false, eventName: "Event" };
    }
    return {
      active: result.rows[0].event_status === true,
      eventName: result.rows[0].event_name || "Event",
    };
  } catch (err) {
    console.error(`Error in isSubmissionActive(${eventId}):`, err);
    return { active: false, eventName: "Event" };
  }
};

module.exports = {
  checkSubmissionActive,
  isSubmissionActive,
};
