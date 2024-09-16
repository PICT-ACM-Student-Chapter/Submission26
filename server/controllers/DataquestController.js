const PostDataQuest=async (req, res) => {
    // const seniors = [ 'TE', 'BE' ]
    const { submission_csv } = req.body; 
    const { submission_python } = req.body;
    const ems_id = emsIds.dataquest;
    const date = new Date();
    const currDate = date.toDateString();
    try {
      const data = await client.query(
        "SELECT * FROM user_events WHERE fk_user=$1 and fk_event=$2",
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
  };

const GetDataQuest =async (req, res) => {
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
}


module.exports={PostDataQuest,GetDataQuest}
  