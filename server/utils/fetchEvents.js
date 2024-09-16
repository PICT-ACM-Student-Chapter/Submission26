const { default: axios } = require("axios");
const client = require("../db/connect");
const { masterEvents } = require("../models/master");
const format = require("pg-format");
const { getSubmissionEvents } = require("../controllers/SubmissionEventController");

const setArr = (ems_events, submission_events, ems_id, userId, finalArr) => {
  const ems_event = ems_events?.find((event) => event.id === ems_id);
  if (!ems_event) {
    return finalArr;
  }
  if (submission_events?.find((event) => event.ems_id === ems_id)) {
    return finalArr;
  }
  const arr = [
    ems_event.id,
    ems_event.name,
    ems_event.description,
    ems_event.type,
    ems_event.mode,
    ems_event.is_active,
    ems_event.play,
    ems_event.tagline,
    ems_event.logo,
    ems_event.start_time,
    ems_event.end_time,
    userId,
    new Date(),
    new Date(),
  ];
  finalArr.push(arr);
  return finalArr;
};


// const fetchEvents = async (ems_token, userId) => {
//   const options = {
//     method: "GET",
//     url: `https://pulzion22-ems-backend-evj4.onrender.com/user_events`,
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${ems_token}`,
//     },
//   };
//   try {
//     const response = await axios(options);
//     //console.log(response.data);
//     console.log("User Events fetched from EMS", response);
//     const result = await client.query(
//       `select * from user_events where fk_user = $1`,
//       [userId]
//     );
//     let ems_events = response.data.events;
//     console.log(ems_events); 
//     const submission_events = await result.rows;
//     console.log(submission_events);
//     let finalArr = [];

//     masterEvents.forEach((event) => {
//       finalArr = setArr(
//         ems_events,
//         submission_events,
//         event.ems_id,
//         userId,
//         finalArr
//       );
//     });
//     if (finalArr?.length > 0) {
//       const query = `INSERT into user_events (ems_id, name, description, type, mode, is_active, play, tagline, logo, start_time, end_time, fk_user, created_at, updated_at) VALUES %L`;
//       await client.query(format(query, finalArr));
//     }
//   } catch (err) {
//     console.log(err);
//   }
// };

// async function FetchUserSubmissionEvents  (ems_token, userId)  {
//   const options = {
//     method: "GET",
//     url: `https://pulzion22-ems-backend-evj4.onrender.com/user_events`,
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${ems_token}`,
//     },
//   };
//   try {
//     const response = await axios(options);
//     //console.log(response.data);
//     console.log("User Events fetched from EMS", response);
//     const result = await client.query(
//       `select * from user_events where fk_user = $1`,
//       [userId]
//     );
//     let ems_events = response.data.events;
//     console.log(ems_events);
//     const submission_events = await getSubmissionEvents();
//     console.log(submission_events);
//     let finalArr = [];
//     const Already_events=result.rows;
//     console.log(Already_events);      
    
    

//     let sub_ems_event = [];
// for (const event of ems_events) {
//   // Find the event by checking if an item in submission_events has the same id as the event
//   const status = submission_events.find(sub_event => sub_event.id === event.id);
//   console.log(status);    
//   // If a matching event is found, push the id to the sub_ems_event array
//   if (status) {
//     sub_ems_event.push(event.id);
//   }       
// }
//     console.log(sub_ems_event);        

//     // const FinalEvents=fetchEvents(ems_events,submission_events,finalArr);
//     // console.log(FinalEvents);
//     // if (finalArr?.length > 0) {
//     //   const query = `INSERT into user_events (ems_id, name, description, type, mode, is_active, play, tagline, logo, start_time, end_time, fk_user, created_at, updated_at) VALUES %L`;
//     //   await client.query(format(query, finalArr)); 
//     // }
//   } catch (err) {
//     console.log(err);
//   }
// };



async function FetchUserSubmissionEvents(ems_token, userId) {
  const options = {
    method: "GET",
    url: `https://pulzion22-ems-backend-evj4.onrender.com/user_events`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ems_token}`,
    },
  };

  try {
    // Fetching events from EMS
    const response = await axios(options);
    let ems_events = response.data.events;

    // Fetching submission events (from another service or DB)
    const submission_events = await getSubmissionEvents();

    // Log the submission events and EMS events for debugging
    console.log("Submission Events", submission_events);
    console.log("EMS Events", ems_events.map(event => event.id));

    // Comparing and filtering matching events
    let sub_ems_event = [];

    // Iterate over EMS events
    for (const emsEvent of ems_events) {
      const isMatching = submission_events.some(subEvent => subEvent=== emsEvent.id);
      console.log(`Matching status for EMS event ID ${emsEvent.id}: ${isMatching ? "Found" : "Not Found"}`);
      if (isMatching) {
        sub_ems_event.push(emsEvent.id);
      }
    }

    // Log final matched event IDs
    console.log("Final matched EMS event IDs:", sub_ems_event);
    const result = await client.query(
      `SELECT * FROM user_events WHERE fk_user = $1`,
      [userId]
    );

    // Declare Already_events with let so it can be reassigned
    let Already_events = result.rows; 
    const already_ids = Already_events.map(item => item.fk_event); // No need to await here since `rows` is synchronous
    console.log(already_ids);   
    
        const new_events = sub_ems_event.filter(eventId => !already_ids.includes(eventId));

    // Log new events that need to be inserted
      console.log("New events to be inserted:", new_events);

    // Insert new events into user_events if any
    if (new_events.length > 0) {
      const insertQuery = `
        INSERT INTO user_events (fk_user, fk_event,created_at,updated_at)
        VALUES ($1, $2,now(),now())      
      `;

      // Insert each new event into the user_events table
      for (const eventId of new_events) {
        await client.query(insertQuery, [userId, eventId]);
        console.log(`Inserted event ID ${eventId} for user ${userId}`);
      }
    } else {
      console.log("No new events to insert.");
    }
            
    // Processing and inserting into the database if necessary
    // (Rest of the code for insertion remains the same)       

  } catch (err) {      
    console.error("Error in FetchUserSubmissionEvents:", err);
  }
}

module.exports = {
  FetchUserSubmissionEvents
};
                   