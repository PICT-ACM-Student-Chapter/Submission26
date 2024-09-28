const client = require("../db/connect");
const { emsIds } = require("../models/master");

const postPaper = async (req, res) => {
    const { type: paper_type, abstract: submission_abstract, submission_paper } = req.body;

    console.log(paper_type);

    try {
        // Check if the user has already submitted a paper
        const query = `SELECT EXISTS (SELECT 1 FROM paper WHERE fk_user = $1)`;
        const result = await client.query(query, [req.user.id]);

        if (result.rows[0].exists) {
            return res.status(400).send({
                error: "Entry Already Submitted",
            });
        } 
    
        if (!paper_type || paper_type.trim() === "") {  
            return res.status(400).send({
                error: "Paper Type not entered",   
            });
        }       

        if (paper_type === "Idea Presentation Track") {
            if (!submission_abstract || submission_abstract.trim() === "") {
                return res.status(400).send({
                    error: "Abstract not provided for Idea Presentation Track",
                });
            }

            const response = await client.query(
                "INSERT INTO paper(type, submission_abstract, active_submission, fk_user, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6) RETURNING *",
                [paper_type, submission_abstract, true, req.user.id, new Date(), new Date()]
            );

            return res.send({
                submission: response.rows[0],
            });
        }

        if (paper_type === "Paper Presentation Track") {
            if (!submission_paper || submission_paper.trim() === "") {
                return res.status(400).send({
                    error: "Paper Not Submitted",
                });
            }

            const response = await client.query(
                "INSERT INTO paper(type, submission_abstract, submission_paper, active_submission, fk_user, created_at, updated_at) VALUES($1, $2, $3, $4, $5, $6,$7) RETURNING *",
                [paper_type, submission_abstract, submission_paper, true, req.user.id, new Date(), new Date()]
            );

            return res.send({
                submission: response.rows[0],
            });
        }

        return res.status(400).send({
            error: "Invalid paper type provided",
        });

    } catch (error) {
        console.log(error);
        return res.status(500).send({
            error: "Internal Server error",
        });
    }
};



const getPaper= async (req, res) => {
    try {
        const response = await client.query(
            "SELECT * FROM paper WHERE fk_user= $1",
            [req.user.id]
        );
        if (response.rowCount === 0) {
            return res.status(200).send({
                error: "Nothing Submitted"
            })
        }
        res.send({
            submission: response.rows[0]
        })
    } catch (error) {
        console.log(error);
        res.status(500).send({
            error: "Internal Server error"
        });
    }
}

const ResultPaper=async(req,res)=>{
    try {
        const query=`SELECT 
                        u.first_name, 
                        u.last_name, 
                        u.mobile_number, 
                        u.year, 
                        p.type,
                        p.submission_abstract,
                        p.submission_paper
                    FROM 
                        users u
                    INNER JOIN 
                        paper p ON u.id = p.fk_user`;
        const result=await client.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({error:"Internal Server Error"});
        
    }
}
module.exports={postPaper,getPaper,ResultPaper};
