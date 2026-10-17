const axios = require("axios"); 
const https = require("https");
const client = require("../db/connect");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const GettingAllEvents = async (req, res) => {
    console.log("Fetching all events...");
    const EMS_API = process.env.EMS_API || "https://api.pulzion.pictacm.in";
    const options = {
        method: "GET",
        url: `${EMS_API}/events`,
        httpsAgent,
        timeout: 10000,
    };
    
    try {
        const response = await axios(options);
        const events = response.data.events || [];
        console.log(`Received ${events.length} events from EMS list.`); 

        for (const item of events) {
            let event = item;
            try {
                // Fetch full details per event if available
                const detailRes = await axios.get(`${EMS_API}/events/${item.id}`, { httpsAgent, timeout: 5000 });
                if (detailRes.data?.events) {
                    event = detailRes.data.events;
                }
            } catch (detailErr) {
                console.warn(`Could not fetch details for event ${item.id}:`, detailErr.message);
            }

            const query = `
              INSERT INTO event ( 
                id, name, description, type, mode, is_active, play, price, link, whatsapp_link,
                tagline, logo, rules, rounds, teams, notes, created_at, updated_at
              ) 
              VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, 
                $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
              )
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                type = EXCLUDED.type,
                mode = EXCLUDED.mode,
                is_active = EXCLUDED.is_active,
                play = EXCLUDED.play,
                price = EXCLUDED.price,
                link = EXCLUDED.link,
                whatsapp_link = EXCLUDED.whatsapp_link,
                tagline = EXCLUDED.tagline,
                logo = EXCLUDED.logo,
                rules = EXCLUDED.rules,
                rounds = EXCLUDED.rounds,
                teams = EXCLUDED.teams,
                notes = EXCLUDED.notes,
                updated_at = EXCLUDED.updated_at;
            `;   
        
            const values = [
              event.id,
              event.name || '',
              event.description || '',
              event.type || null,
              event.mode || null,
              event.is_active !== undefined ? event.is_active : true,
              event.play !== undefined ? event.play : true,
              typeof event.price === 'number' ? event.price : (parseInt(event.price, 10) || 0),
              event.link || null,
              event.whatsapp_link || null,
              event.tagline || '',
              event.logo || '',
              event.rules || '',
              event.rounds || '',
              event.teams || '',
              event.notes || '',
              event.created_at ? new Date(event.created_at) : new Date(),
              event.updated_at ? new Date(event.updated_at) : new Date(),
            ];
        
            try {
              await client.query(query, values);
              console.log(`Event with ID: ${event.id} (${event.name}) upserted successfully.`);
            } catch (dbError) {
              console.error(`Error inserting event ${event.id}:`, dbError.message);
            }
        }
      res.status(200).json({ message: "done", count: events.length });


    } catch (error) {
        console.error("Error fetching events:", error.message); // Log the error message
        res.status(500).json({ error: "Failed to fetch events" }); // Send error response
    }
};


const GetAllEventFromEms=async(req,res)=>{
  try {
      const query=`select * from event;`
      const result=await client.query(query);
      res.status(200).json(result.rows)
  } catch (error) {
      console.log(error);
      res.status(500).json({error:"internal server error !"})
  }
}
module.exports={GettingAllEvents,GetAllEventFromEms}; 