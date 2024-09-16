const client = require("../db/connect");

const addSubmissonEvent = async (req, res) => {
    try {
        const event_id = req.body.id;
        const event_name = req.body.name;
        const event_route = req.body.route;
        const event_status = req.body.status;

        if (!event_id || !event_name || !event_route) {
            return res.status(400).json({ message: "Please fill all the fields" });
        }

        const query = `INSERT INTO submission_event 
                        (event_id, event_name, event_route, event_status)
                        VALUES ($1, $2, $3, $4);`;
        const params = [event_id, event_name, event_route, event_status];

        await client.query(query, params);
        return res.status(200).json({ message: "Event added successfully !!" });
    } catch (error) {
        console.error(error); // Log the error for debugging
        return res.status(500).json({ message: "Internal server error !!" });
    }
};    

  
const updateSubmissionEvent = async (req, res) => {
    try {
        const event_id = req.params.id;
        const event_name = req.body.name;
        const event_route = req.body.route;
        const event_status = req.body.status;

        if (!event_id) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const query = `UPDATE submission_event
                       SET event_name = $1, event_route = $2, event_status = $3
                       WHERE event_id = $4;`;
        const params = [event_name, event_route, event_status, event_id];
        await client.query(query, params);
        res.status(200).json({ message: "Event updated successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error!" });
    }
};
const deleteSubmissionEvent = async (req, res) => {
    try {
        const event_id = req.params.id;

        if (!event_id) {
            return res.status(400).json({ message: "Event ID is required" });
        }

        const query = `DELETE FROM submission_event
                       WHERE event_id = $1;`;
        const params = [event_id];
        await client.query(query, params);
        res.status(200).json({ message: "Event deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error!" });
    }
};
const getSubmissionEvents = async () => {
    try {
        const query = `SELECT event_id FROM submission_event;`;
        const result = await client.query(query);
        const eventIds = result.rows.map(row => row.event_id);
        return eventIds;
    } catch (error) {
        console.error("Error fetching submission events:", error);
        throw new Error("Internal server error!");
    }
};
const getAllSubmissionEvents = async (req,res) => {
    try {
        const query = `SELECT * FROM submission_event;`;
        const result = await client.query(query);
        const eventIds = result.rows
        return res.status(200).json(eventIds);
    } catch (error) {
        console.error("Error fetching submission events:", error);
        throw new Error("Internal server error!");
    }
};
module.exports={addSubmissonEvent,updateSubmissionEvent,deleteSubmissionEvent,getSubmissionEvents,getAllSubmissionEvents};