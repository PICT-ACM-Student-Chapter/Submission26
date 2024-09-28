const axios  = require("axios");
const client = require("../db/connect");

// const PostDataQuest=async (req, res) => {
//     // const seniors = [ 'TE', 'BE' ]
//     console.log("dataquest 1")
//     const { submission_csv } = req.body; 
//     const { submission_python } = req.body;
//     const date = new Date();
//     const currDate = date.toDateString();
//     try {
//       const query = `select * from dataquest where fk_user = $1 and Date(created_at) = $2`;
//       const result = await client.query(query, [req.user.id, currDate]);
//       if (result.rowCount >= 5) {
//         return res.status(400).send({
//           error: "You have reached maximum submission limit for today.",
//         });
//       }
//       let options;       
//       console.log("at 37",submission_csv)
//       options = {
//         method: "POST",
//         url: `http://localhost:5000/dataquest-round-1`,
//         headers: {
//           "Content-Type": "application/json",
//         },
//         data: {
//           file_url: submission_csv,       
//           seniority: req.user.year,          
//         },   
//       };   
  
//       const accData = await axios(options);
//       console.log(accData);
//       const private_accuracy = accData.data.private;
//       const public_accuracy = accData.data.public;         
//       const response = await client.query(
//         "INSERT INTO dataquest(fk_user, submission_csv, submission_python, private_accuracy, public_accuracy, active_submission, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, fk_user, submission_csv, submission_python, public_accuracy, created_at, updated_at",
//         [
//           req.user.id,
//           submission_csv,
//           submission_python,
//           private_accuracy,
//           public_accuracy,
//           true, 
//           new Date(),
//           new Date(),
//         ]
//       );
//       res.send({
//         submission: response.rows[0],
//       });
//     } catch (error) {
//       console.log(error);
//       res.status(500).send({
//         error: "Internal Server error",
//       });
//     }
//   };


const PostDataQuest=async (req, res) => {
  // const seniors = [ 'TE', 'BE' ]
  console.log("dataquest 1")
  const { submission_csv } = req.body; 
  const { submission_python } = req.body;
  const date = new Date();
  const currDate = date.toDateString();
  try {
    const query = `select * from dataquest where fk_user = $1 and Date(created_at) = $2`;
    const result = await client.query(query, [req.user.id, currDate]);
    if (result.rowCount >= 5) {
      return res.status(400).send({
        error: "You have reached maximum submission limit for today.",
      });
    }
           
    console.log("at 37",submission_csv)
    options = {
      method: "POST",
      url: `http://evaluation:5000/dataquest-round-1`,
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        file_url: submission_csv,       
        seniority: req.user.year,          
      },   
    };   
    // const options = {
    //   method: "GET",
    //   url: `http://evaluation:5000/is_up`
    // };   
    

    const accData = await axios(options);
   // console.log("error")
    //console.log(accData);
    const private_accuracy = accData.data.private;
    const public_accuracy = accData.data.public;
    console.log(private_accuracy);
    console.log(public_accuracy);     
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
};


const GetDataQuest =async (req, res) => {
    try {
      const response = await client.query(
        "SELECT id, fk_user, submission_csv, submission_python, public_accuracy, created_at, updated_at FROM dataquest WHERE fk_user= $1",
        [req.user.id]
      );
      if (response.rowCount === 0) {
        return res.status(200).send({
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
}
const getLeaderBoard = async (req, res) => {
  const seniors = ["TE", "BE"];
  const isSenior = seniors.includes(req.user.year);

  try {
    let query;
    let params;

    if (isSenior) {
      // Query for seniors (TE and BE)
      query = `
        SELECT users.first_name, users.last_name, MIN(dataquest.public_accuracy), users.email 
        FROM dataquest 
        JOIN users ON dataquest.fk_user = users.id 
        WHERE users.year IN ($1, $2) 
        GROUP BY users.first_name, users.last_name, users.email 
        ORDER BY 3 ASC`;
      params = seniors;
    } else {
      // Query for juniors (FE and SE)
      query = `
        SELECT users.first_name, users.last_name, MIN(dataquest.public_accuracy), users.email 
        FROM dataquest 
        JOIN users ON dataquest.fk_user = users.id 
        WHERE users.year IN ('FE', 'SE') 
        GROUP BY users.first_name, users.last_name, users.email 
        ORDER BY 3 ASC`;
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


module.exports={PostDataQuest,GetDataQuest,getLeaderBoard};
  