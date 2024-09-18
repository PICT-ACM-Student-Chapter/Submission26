const { default: axios } = require('axios');
const express = require('express');
const client = require('../db/connect');
const isUserAuthenticated = require('../middleware/userMiddleware');

const router = express.Router();

router.get('/', isUserAuthenticated, async (req, res) => {
    try {
        const query = 'select * from user_events where fk_user = $1';
        const result = await client.query(query, [req.user.id]);
        res.send({
            events: result.rows,
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

module.exports = router;