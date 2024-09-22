const client = require("../db/connect");
const { param } = require("../Routes/AlleventRoutes");

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
           

        if(!submission){
            res.status(400).json({message:"please enter submission content !!"})
        }
        const insertquery=`INSERT INTO InnoWave (Innowave_type, submission, active_submission, fk_user, created_at, updated_at)
                    values(,$2,$3,$4,now(),now());`
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

        const query = `select exists (select * from Innowave where fk_user = $1)`
        const result = await client.query(query, [req.user.id]);
        if (result.rows[0].exists) {
            return res.status(400).send({
                error: "Entry Already Submitted",
            })
        } 
           

        if(!submission){
            res.status(400).json({message:"please enter submission content !!"})
        }
        const insertquery=`INSERT INTO InnoWave2 (Innowave_type, submission, active_submission, fk_user, created_at, updated_at)
                    values("link",$2,$3,$4,now(),now());`
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
    const type=req.params.type;
    try {
        const query=`select * from InnoWave Where Innowave_type=$1`;
        const params=[type];
        const result=await client.query(query,params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.log(error);
        res.status(500).send({
            error: "Internal Server error"
        });
    }
}

module.exports={postInnowave,ResultInnoWave,postInnowave2};