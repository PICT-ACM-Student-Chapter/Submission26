
const client = require("../db/connect");
const { emsIds } = require("../models/master");

const PostWebApp= async (req, res) =>
    {
      const { submission } = req.body;
      console.log(submission);
      const ems_id = emsIds.web;
      try
      {
        const data = await client.query(
          "SELECT * FROM user_events WHERE fk_user=$1 and fk_event=$2",
          [req.user.id, ems_id]
        );
    
        if (data.rowCount === 0)
        {
          return res.status(400).send({
            error: "User havent Registered ",
          });
        }
        const query = `select exists (select * from webapp where fk_user = $1)`;
        const result = await client.query(query, [req.user.id]);
        if (result.rows[0].exists)
        {
          return res.status(400).send({
            error: "Entry Already Submitted",
          });
        }
        const response = await client.query(
          "INSERT INTO webapp(submission, active_submission, fk_user, created_at, updated_at) VALUES($1, $2, $3, $4, $5) RETURNING *",
          [submission, true, req.user.id, new Date(), new Date()]
        );
        res.send({
          submission: response.rows[0],
        });
      } catch (error)
      {
        console.log(error);
        res.status(500).send({
          error: "Internal Server error",
        });
      }
    };
const GetWebApp= async (req, res) =>
    {
      try
      {
        const response = await client.query(
          "SELECT * FROM webapp WHERE fk_user= $1",
          [req.user.id]
        );
    
        if (response.rowCount === 0)
        {
          return res.status(400).send({
            error: "Nothing Submitted",
          });
        }
        res.send({
          submission: response.rows[0],
        });
      } catch (error)
      {
        console.log(error);
        res.status(500).send({
          error: "Internal Server error",
        });
      }
    };

module.exports={PostWebApp,GetWebApp};