
const client = require("../db/connect");
const jwt = require("jsonwebtoken");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

exports.isAdminAuthenticated = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        const token = (authHeader ? authHeader.replace(/^Bearer\s+/i, "").trim() : null) 
                   || req.query.token 
                   || req.query.admin_token;
        
        if (!token) {
            return res.status(401).json({ error: "Unauthorized Admin! Token is required." });
        }

        // 1. Verify JWT signature and 1-day session expiration
        try {
            jwt.verify(token, process.env.TOKEN_SECRET || "secret");
        } catch (jwtErr) {
            if (jwtErr.name === "TokenExpiredError") {
                await client.query("DELETE FROM admin_token WHERE token = $1", [token]).catch(() => {});
                return res.status(401).json({ error: "Session expired! Please login again." });
            }
            return res.status(401).json({ error: "Unauthorized Admin!" });
        }

        // 2. Verify token existence and validity in database
        let query = `select * from admin_token where token = $1 and is_valid = true`;
        let params = [token];
        const data = await client.query(query, params);
        if (data.rowCount < 1) {
            return res.status(401).json({ error: "Unauthorized Admin!" });
        }

        // 3. Database timestamp check (1 day / 24 hours max lifetime)
        const tokenCreatedAt = new Date(data.rows[0].created_at).getTime();
        if (Date.now() - tokenCreatedAt > ONE_DAY_MS) {
            await client.query("DELETE FROM admin_token WHERE token = $1", [token]).catch(() => {});
            return res.status(401).json({ error: "Session expired! Please login again." });
        }

        const Adminid = data.rows[0].fk_admin;
        query = `SELECT id, username, created_at, updated_at from Admin where id = $1`;
        params = [Adminid];
        const result = await client.query(query, params);
        if (result.rowCount < 1) {
            return res.status(401).json({ error: "Unauthorized Admin!" });
        }
        req.admin = result.rows[0];
        req.token = token;
        next();
    } catch (e) {
        return res.status(401).json({ error: "Unauthorized Admin!" });
    }
};