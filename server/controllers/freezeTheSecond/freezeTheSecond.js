// freezeController.js
const client = require('../db/connect');
const { emsIds } = require("../models/master");

const submitFreeze = async (req, res) => {
  try {
    const { submission } = req.body;
    const ems_id = emsIds.freeze;

    // Check if user has registered
    const userData = await client.query(
      "SELECT * FROM user_events WHERE fk_user=$1 and ems_id=$2",
      [req.user.id, ems_id]
    );
    if (userData.rowCount === 0) {
      return res.status(400).send({
        error: "User hasn't Registered"
      });
    }

    // Check if user has already submitted
    const query = `select exists (select * from freeze_submission where fk_user = $1)`;
    const result = await client.query(query, [req.user.id]);
    if (result.rows[0].exists) {
      return res.status(400).send({
        error: "Entry Already Submitted"
      });
    }

    // Insert submission into database
    const response = await client.query(
      "INSERT INTO freeze_submission(submission, active_submission, fk_user, created_at, updated_at) VALUES($1, $2, $3, $4, $5) RETURNING * ",
      [submission, true, req.user.id, new Date(), new Date()]
    );
    res.send({
      submission: response.rows[0]
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Internal Server error"
    });
  }
};

const getFreezeSubmission = async (req, res) => {
  try {
    const response = await client.query(
      "SELECT * FROM freeze_submission WHERE fk_user= $1",
      [req.user.id]
    );
    if (response.rowCount === 0) {
      return res.status(400).send({
        error: "Nothing Submitted"
      });
    }
    res.send({
      submission: response.rows[0]
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Internal Server error"
    });
  }
};

module.exports = { submitFreeze, getFreezeSubmission };