// const axios = require('axios');

const { default: axios } = require("axios");
const express = require("express");
const client = require("../db/connect");
const isUserAuthenticated = require("../middleware/userMiddleware");
const { emsIds } = require("../models/master");

const router = new express.Router();

router.post("/", isUserAuthenticated, async (req, res) => {
  // const seniors = [ 'TE', 'BE' ]
  const { submission_csv } = req.body;
  const { submission_python } = req.body;
  const ems_id = emsIds.dataquest;
  const date = new Date();
  const currDate = date.toDateString();
  try {
    const data = await client.query(
      "SELECT * FROM user_events WHERE fk_user=$1 and ems_id=$2",
      [req.user.id, ems_id]
    );
    console.log("No error at line23");
    if (data.rowCount === 0) {
      return res.status(400).send({
        error: "User havent Registered ",
      });
    }
    const query = `select * from dataquest where fk_user = $1 and Date(created_at) = $2`;
    const result = await client.query(query, [req.user.id, currDate]);
    if (result.rowCount >= 5) {
      return res.status(400).send({
        error: "You have reached maximum submission limit for today.",
      });
    }
    let options;
    console.log("at 37",submission_csv)
    options = {
      method: "POST",
      url: `${process.env.EVALUATION}/dataquest-round-1`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        file_url: submission_csv,
        seniority: req.user.year,
      },
    };

    const accData = await axios(options);
    console.log(accData);
    const private_accuracy = accData.data.private;
    const public_accuracy = accData.data.public;
    const response = await client.query(
      "INSERT INTO dataquest(fk_user, submission_csv, submission_python, private_accuracy, public_accuracy, active_submission, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, fk_user, submission_csv, submission_python, public_accuracy, created_at, updated_at",
      [
        req.user.id,
        submission_csv,
        submission_python,
        private_accuracy,
        public_accuracy,
        true,
        new Date(),
        new Date(),
      ]
    );
    res.send({
      submission: response.rows[0],
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Internal Server error",
    });
  }
});

router.get("/", isUserAuthenticated, async (req, res) => {
  try {
    const response = await client.query(
      "SELECT id, fk_user, submission_csv, submission_python, public_accuracy, created_at, updated_at FROM dataquest WHERE fk_user= $1",
      [req.user.id]
    );
    if (response.rowCount === 0) {
      return res.status(400).send({
        error: "Nothing Submitted",
      });
    }
    res.send({
      submissions: response.rows,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Internal Server error",
    });
  }
});

router.get("/leaderboard", isUserAuthenticated, async (req, res) => {
  const seniors = ["TE", "BE"];
  const isSenior = seniors.includes(req.user.year) ? seniors : ["FE", "SE"];
  try {
    
      const response = await client.query(
        "select  users.first_name, users.last_name, MAX(dataquest.public_accuracy), users.email from dataquest join users on dataquest.fk_user = users.id where users.year = $1 or users.year = $2 group by users.first_name, users.last_name, users.email order by 3 DESC",
        isSenior
      );
      if (response.rowCount <= 2) {
        return res.status(400).send({
          error: "Leaderboard is empty",
        });
      }
      res.send({
        submissions: response.rows,
      });
  //   } else {
  //   const response = await client.query(
  //     "select  users.first_name, users.last_name, MAX(dataquest.public_accuracy), users.email from dataquest join users on dataquest.fk_user = users.id group by users.first_name, users.last_name, users.email order by 3 DESC limit 5"
  //   );
  //   if (response.rowCount === 0) {
  //     return res.status(400).send({
  //       error: "Leaderboard is empty",
  //     });
  //   }
  //   res.send({
  //     submissions: response.rows,
  //   });
  // } 
}
  catch (error) {
    console.log(error);
    res.status(500).send({
      error: "Internal Server error",
    });
  }
});

module.exports = router;
