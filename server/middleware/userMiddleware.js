const client = require("../db/connect");
const jwt = require("jsonwebtoken");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const isUserAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader) {
            return res.status(401).json({ error: "Unauthorized user!" });
        }

        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (!token) {
            return res.status(401).json({ error: "Unauthorized user!" });
        }

        // 1. Verify JWT signature and 1-day session expiration
        try {
            jwt.verify(token, process.env.TOKEN_SECRET || "secret");
        } catch (jwtErr) {
            if (jwtErr.name === "TokenExpiredError") {
                await client.query("DELETE FROM user_token WHERE token = $1", [token]).catch(() => {});
                return res.status(401).json({ error: "Session expired! Please login again." });
            }
            return res.status(401).json({ error: "Unauthorized user!" });
        }

        // 2. Verify token existence and validity in database
        let query = "select * from user_token where token = $1 and is_valid = true";
        let params = [token];
        const data = await client.query(query, params);
        if (data.rowCount < 1) {
            return res.status(401).json({ error: "Unauthorized user!" });
        }

        // 3. Database timestamp check (1 day / 24 hours max lifetime)
        const tokenCreatedAt = new Date(data.rows[0].created_at).getTime();
        if (Date.now() - tokenCreatedAt > ONE_DAY_MS) {
            await client.query("DELETE FROM user_token WHERE token = $1", [token]).catch(() => {});
            return res.status(401).json({ error: "Session expired! Please login again." });
        }

        const userId = data.rows[0].fk_user;
        const ems_token = data.rows[0].ems_token;
        query =
            "SELECT id, first_name, last_name, email, mobile_number, college, created_at, updated_at, year, ems_id from users where id = $1";
        params = [userId];
        const result = await client.query(query, params);
        if (result.rowCount < 1) {
            return res.status(401).json({ error: "Unauthorized user!" });
        }
        req.user = result.rows[0];
        // console.log(result.rows[0]);
        req.token = token;
        req.ems_token = ems_token;
        next();

    } catch (err) {
        return res.status(401).json({ error: 'Unautherised User!' });
    }
};

module.exports = isUserAuthenticated;  