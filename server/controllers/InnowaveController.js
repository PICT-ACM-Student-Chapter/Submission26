const client = require("../db/connect");

const postInnowave=async (req, res) => {
    // const { submission } = req.body;
    
    const submission=req.body.submission;
    try {

        const query = `select exists (select * from Innowave where fk_user = $1)`
        const result = await client.query(query, [req.user.id]);
        if (result.rows[0].exists) {
            return res.status(400).send({
                error: "Entry Already Submitted",
            })
        } 
           
        const type="ppt";
        if(!submission){
            res.status(400).json({message:"please enter submission content !!"})
        }
        const insertquery=`INSERT INTO InnoWave (Innowave_type, submission, active_submission, fk_user, created_at, updated_at)
                    values($1,$2,$3,$4,now(),now());`
        const params=[type,submission,true,req.user.id];
        const insert_result= await client.query(insertquery,params);
        return res.status(200).json({
            message: 'Submitted successfully !!',                
            data: insert_result.rows
          });
   
    } catch (error) { 
        console.log(error);
        res.status(500).send({
            error: "Internal Server error"    
        });  
    }
}

const postInnowave2=async (req, res) => {
    // const { submission } = req.body;
    
    const submission=req.body.submission;
    try {

        const query = `select exists (select * from Innowave2 where fk_user = $1)`
        const result = await client.query(query, [req.user.id]);
        if (result.rows[0].exists) {
            return res.status(400).send({
                error: "Entry Already Submitted",
            })
        } 
        const type="link";

        if(!submission){
            res.status(400).json({message:"please enter submission content !!"})
        }
        const insertquery=`INSERT INTO InnoWave2 (Innowave_type, submission, active_submission, fk_user, created_at, updated_at)
                    values($1,$2,$3,$4,now(),now());`
        const params=[type,submission,true,req.user.id];
        const insert_result= await client.query(insertquery,params);
        return res.status(200).json({
            message: 'Submitted successfully !!',
            data: insert_result.rows
          });
   
    } catch (error) {
        console.log(error);
        res.status(500).send({
            error: "Internal Server error"
        });
    }
}
const ResultInnoWave=async(req,res)=>{
    try {
        const query=`SELECT 
                    u.first_name, 
                    u.last_name, 
                    u.mobile_number, 
                    u.year, 
                    i.Innowave_type,
                    i.submission
                    FROM 
                    users u
                    INNER JOIN 
                    InnoWave i ON u.id = i.fk_user;`;
        const result=await client.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).send({
            error: "Internal Server error"
        });
    }
}
const ResultInnoWave2=async(req,res)=>{
    const type=req.params.type;
    try {
        const query=`SELECT 
                    u.first_name, 
                    u.last_name, 
                    u.mobile_number, 
                    u.year, 
                    i.Innowave_type,
                    i.submission
                    FROM 
                    users u
                    INNER JOIN 
                    InnoWave2 i ON u.id = i.fk_user;`;
        const result=await client.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).send({
            error: "Internal Server error"
        });
    }
}
const getinnowave1=async (req, res) => {
    try {
        const response = await client.query(
            "SELECT * FROM Innowave WHERE fk_user= $1",
            [req.user.id]
        );
         console.log("Request aayi");   
        if (response.rowCount === 0) {
            console.log("No dude no");
            return res.status(400).send({
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
const getinnowave2=async (req, res) => {
    try {
        const response = await client.query(
            "SELECT * FROM InnoWave2 WHERE fk_user= $1",
            [req.user.id]
        );
         console.log("Request aayi");   
        if (response.rowCount === 0) {
            console.log("No dude no");
            return res.status(400).send({
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


module.exports={postInnowave,ResultInnoWave,postInnowave2,ResultInnoWave2,getinnowave1,getinnowave2};