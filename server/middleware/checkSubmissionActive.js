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

      if (result.rowCount > 0 && result.rows[0].event_status === false) {
        const eventName = result.rows[0].event_name || "this event";
        return res.status(403).json({
          error: `Submissions for ${eventName} are currently closed.`,
          message: `Submissions for ${eventName} are not active at this time.`,
          event_status: false,
          event_id: eventId,
        });
      }

      next();
    } catch (err) {
      console.error(`Error checking submission active status for event ${eventId}:`, err);
      // Let it pass to controller if there's an unexpected DB error in middleware
      next();
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
      return { active: true, eventName: "Event" };
    }
    return {
      active: result.rows[0].event_status !== false,
      eventName: result.rows[0].event_name || "Event",
    };
  } catch (err) {
    console.error(`Error in isSubmissionActive(${eventId}):`, err);
    return { active: true, eventName: "Event" };
  }
};

module.exports = {
  checkSubmissionActive,
  isSubmissionActive,
};
