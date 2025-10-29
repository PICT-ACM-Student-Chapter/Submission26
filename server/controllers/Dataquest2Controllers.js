const { default: axios } = require("axios");
const client = require("../db/connect");

const postDataQuest2= async (req, res) =>
    {
      console.log("in dataquest 2");
      const seniors = ["TE", "BE"];
      const { submission_csv } = req.body;
      const { submission_python } = req.body;

      const date = new Date();
      const currDate = date.toDateString();
      try    
      {
        // TODO: Add registration check once dataquest2 event_id is added to master.js
        // const { emsIds } = require("../models/master");
        // const dataquest2_event_id = emsIds.dataquest2;
        // const registrationCheck = await client.query(
        //   "SELECT * FROM user_events WHERE fk_user=$1 AND fk_event=$2",
        //   [req.user.id, dataquest2_event_id]
        // );
        // if (registrationCheck.rowCount === 0) {
        //   return res.status(403).send({
        //     error: "You must register for the DataQuest 2 event before submitting",
        //   });
        // }
        
        const query = `select * from dataquest2 where fk_user = $1 and Date(created_at) = $2`;
        const result = await client.query(query, [req.user.id, currDate]);
        const submissionsToday = result.rowCount;
        const maxSubmissions = 5;

        if (submissionsToday >= maxSubmissions)
        {
          return res.status(200).send({
            error: `You have reached the maximum submission limit for today (${submissionsToday}/${maxSubmissions} submissions used).`,
          });
        }
        let options;
    
        options = {
          method: "POST",
          url: `http://evaluation:5000/te-be-round-2`,
          headers: {
            "Content-Type": "application/json",
          },
          data: {
            file_url: submission_csv,
          },
        };
    
        console.log("Making DataQuest2 request to evaluation server:", options);
        const accData = await axios(options);
        console.log("DataQuest2 evaluation server response:", JSON.stringify(accData.data, null, 2));
        
        // Check if the response has the expected structure
        if (!accData.data || !accData.data.private || !accData.data.public) {
          console.log("ERROR: Unexpected DataQuest2 response structure from evaluation server");
          throw new Error("Invalid DataQuest2 evaluation server response structure");
        }
        
        const private_accuracy = accData.data.private.f1_score;
        const public_accuracy = accData.data.public.f1_score;
        console.log("DataQuest2 parsed scores - Private:", private_accuracy, "Public:", public_accuracy);
        const response = await client.query(
          "INSERT INTO dataquest2(fk_user, submission_csv, submission_python, private_accuracy, public_accuracy, active_submission, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, fk_user, submission_csv, submission_python, public_accuracy, created_at, updated_at",
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
      } catch (error)
      {
        console.log("=== DATAQUEST2 ERROR ===");
        console.log("Error type:", error.name);
        console.log("Error message:", error.message);
        if (error.response) {
          console.log("Error response status:", error.response.status);
          console.log("Error response data:", error.response.data);
        }
        console.log("Full error:", error);
        console.log("=== END DATAQUEST2 ERROR ===");
        
        res.status(500).send({
          error: "Internal Server error: " + error.message,
        });
      }
    }
const GetDataQuest2=async (req, res) =>
        {
          try
          {
            const response = await client.query(
              "SELECT id, fk_user, submission_csv, submission_python, public_accuracy, created_at, updated_at FROM dataquest2 WHERE fk_user= $1",
              [req.user.id]
            );
            if (response.rowCount === 0)
            {
              return res.status(200).send({
                error: "Nothing Submitted",
              });
            }
            res.send({
              submissions: response.rows,
            });
          } catch (error)
          {
            console.log(error);
            res.status(500).send({
              error: "Internal Server error",
            }); 
          }
        };

const GetLeaderBoard2 = async (req, res) => {
  const seniors = ["TE", "BE"];
  const isSenior = seniors.includes(req.user.year);
  
  try {
    let query;
    let params;
    
    if (isSenior) {
      // Query for seniors (TE and BE) - Round 2
      query = `
        SELECT users.first_name, users.last_name, MAX(dataquest2.public_accuracy) as max, users.email 
        FROM dataquest2 
        JOIN users ON dataquest2.fk_user = users.id 
        WHERE users.year = $1 OR users.year = $2 
        GROUP BY users.first_name, users.last_name, users.email 
        ORDER BY max DESC 
        LIMIT 3`;
      params = seniors;
    } else {
      // Query for juniors (FE and SE) - Round 2
      query = `
        SELECT users.first_name, users.last_name, MAX(dataquest2.public_accuracy) as max, users.email 
        FROM dataquest2 
        JOIN users ON dataquest2.fk_user = users.id 
        WHERE users.year = 'FE' OR users.year = 'SE' 
        GROUP BY users.first_name, users.last_name, users.email 
        ORDER BY max DESC 
        LIMIT 3`;
      params = [];
    }
    
    const response = await client.query(query, params);
    
    if (response.rowCount === 0) {
      return res.status(400).send({
        error: "Leaderboard is empty",
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
};
const GetAllDataQuest2Submissions = async (req, res) => {
  try {
    const query = `
      SELECT 
        users.first_name, 
        users.last_name, 
        users.email,
        users.year,
        dataquest2.id,
        dataquest2.submission_csv,
        dataquest2.submission_python,
        dataquest2.public_accuracy,
        dataquest2.private_accuracy,
        dataquest2.created_at,
        dataquest2.updated_at
      FROM dataquest2
      JOIN users ON dataquest2.fk_user = users.id
      ORDER BY dataquest2.created_at DESC
    `;
    
    const response = await client.query(query);
    
    if (response.rowCount === 0) {
      return res.status(200).send({
        submissions: [],
        message: "No submissions found"
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
};

module.exports={postDataQuest2,GetLeaderBoard2,GetDataQuest2,GetAllDataQuest2Submissions}
