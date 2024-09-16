const axios=require("axios"); 
const client = require("../db/connect");
const {generateUserToken} = require("../utils/generateUserTokens");
const {FetchUserSubmissionEvents}= require("../utils/fetchEvents");


const signInUser=async (req, res) => {
    const { email, password } = req.body;
    console.log(`email : ${email}`);
    console.log(`password : ${password}`); 
    const options = {
        method: "POST",
        url: `https://pulzion22-ems-backend-evj4.onrender.com/user/signin`,
        headers: {
            "Content-Type": "application/json",
        },
        data: {
            email,
            password
        }, 
    };
    try {
        let response = await axios(options)
        let user = response.data.user;
        if (response?.data?.error) {
            return res.status(400).send({ 
                error: response.data.error, 
            })
        }
        const ems_token = response.data.token;
        response = await client.query('select * from users where ems_id = $1', [user.id])
        if (response.rowCount === 0) {
            response = await client.query(
                "INSERT INTO users( first_name, last_name, email, mobile_number, college, year, created_at, updated_at, ems_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
                [user.first_name, user.last_name, user.email, user.mobile_number, user.college, user.year, new Date(), new Date(), user.id]
            );
        } 
        user = response.rows[0]
        console.log(user);
        const userId = user.id;
        const token = await generateUserToken(userId, ems_token);

        // await fetchEvents(ems_token, userId);
       await FetchUserSubmissionEvents(ems_token,userId);

        res.send({
            user,
            token, 
            ems_token
        })
    } catch (err) {
        console.log(err)
        if (err?.response) {
            return res.status(400).send(err?.response?.data);
        }
        const duplicateError = err.message.split(" ").pop().replaceAll('"', '');
        if (duplicateError === "users_email_key") {
            res.status(409).json({ error: "User with this email already exists" })
        }
        else if (duplicateError === "users_mobile_number_key") {
            res.status(409).json({ error: "User with this mobile_number already extsts" })
        }
        else {
            res.status(500).json({ error: "Internal Server Error" });
        }
    }
};

const GetUserEvent=async(req,res)=>{
    try {
        const userId=req.user.id;
        if(!userId){
            res.status(400).json({message:"user not found !!"})
        }
        const query=`SELECT 
    e.id AS event_id,
    e.logo,
    se.event_name,
    se.event_route,
    se.event_status
FROM 
    user_events ue
JOIN 
    event e ON ue.fk_event = e.id
JOIN 
    submission_event se ON se.event_id = e.id
WHERE 
    ue.fk_user = $1;  -- Replace $1 with the user_id parameter
`
    const params=[userId];
    const result=await client.query(query,params);
    if(result.rowCount==0){
        res.status(500).json({message:"not registered to any event !!"});
    }
    return res.status(200).json(result.rows);
    } catch (error) {
        
    }
}
const signoutUser= async (req, res) => {    
    const options = {
        method: "POST",
        url: `https://pulzion22-ems-backend-evj4.onrender.com/user/signout`,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${req.ems_token}`,
        },
    };
    try {   
        const query = "delete from user_token where token = $1";
        const params = [req.token];
        const data = await client.query(query, params);
        if (data.rowCount === 1) {
            return res.status(200).json({ success: "successfully logged out" });
        } else { 
            const response = await axios(options);
            return res.status(500).json({ error: "Unable to log out" });
        }
    } catch (err) {
        console.log(err)
        if (err?.response) {
            return res.status(400).send(err?.response?.data);
        }
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports={signInUser,signoutUser,GetUserEvent};    