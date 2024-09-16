const client = require("../db/connect");
const jwt = require("jsonwebtoken");


/**
 * Generates Signed JWT token and stores it in user_token
 * @param {String} userId
 * @returns {String} JWT token
 */
const generateUserToken = async (userId, ems_token) => {
    //console.log(userId);
    try {
        const timestamp = new Date();
        const token = jwt.sign({ id: userId }, process.env.TOKEN_SECRET||"secret");
        let tokenRecord =
            "INSERT INTO user_token(token, is_valid, ems_token, created_at, updated_at, fk_user) VALUES ($1, $2, $3, $4, $5, $6)";
        let tokenValues = [token, true, ems_token, timestamp, timestamp, userId];
        await client.query(tokenRecord, tokenValues);
        return token;
    } catch (err) {
        throw new Error(err);
    }
};


const generateAdminToken = async (adminId) => {
    try {
        const timestamp = new Date();
        const token = jwt.sign({ id: adminId }, process.env.TOKEN_SECRET || "secret"); // Use adminId instead of userId
        const tokenRecord =
            "INSERT INTO admin_token(token, is_valid, created_at, updated_at, fk_admin) VALUES ($1, $2, $3, $4, $5)";
        const tokenValues = [token, true, timestamp, timestamp, adminId];
        
        await client.query(tokenRecord, tokenValues);
        return token;
    } catch (err) {
        throw new Error(err);
    }
};


module.exports = {generateUserToken,generateAdminToken};