const axios=require("axios"); 
const client = require("../db/connect");

const GettingAllEvents = async (req, res) => {
    console.log("Fetching all events...");
    const options = {
        method: "GET",
        url: `https://pulzion22-ems-backend-evj4.onrender.com/events`,
    };
    
    try {
        const response = await axios(options);
        const events=response.data.events;
        console.log(events); 
        for (const event of events) {
            const query = `
              INSERT INTO event ( 
                id, name, description, type, mode, is_active, play, price, link, 
                tagline, logo, rules, rounds, teams, notes, created_at, updated_at
              ) 
              VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, 
                $9, $10, $11, $12, $13, $14, $15, $16,$17
              );
            `;   
        
            const values = [
              event.id,              // Ensure this is valid if id is not auto-increment
              event.name,
              event.description,
              event.type,            // Ensure this matches enum type
              event.mode,            // Ensure this matches enum type
              event.is_active,
              event.play,
              event.price,
              event.link,
              event.tagline,
              event.logo,
              event.rules,
              event.rounds,
              event.teams,
              event.notes,
              event.created_at,
              event.updated_at  // Convert to ISO string
            ];
        
            try {
              await client.query(query, values);
              console.log(`Event with ID: ${event.id} inserted successfully.`);
            } catch (dbError) {
              console.error('Error inserting event:', dbError.message);
            }
        }
      res.status(200).json({message:"done"});


    } catch (error) {
        console.error("Error fetching events:", error.message); // Log the error message
        res.status(500).json({ error: "Failed to fetch events" }); // Send error response
    }
};
module.exports={GettingAllEvents}; 