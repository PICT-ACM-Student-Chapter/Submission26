const { default: axios } = require("axios");
const client = require("../db/connect");
const { masterEvents } = require("../models/master");
const format = require("pg-format");

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

const fetchEvents = async (ems_token, userId) => {
  const options = {
    method: "GET",
    url: `${process.env.EMS_API}/user_events`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ems_token}`,
    },
  };
  try {
    const response = await axios(options);
    console.log("User Events fetched from EMS", response);
    const result = await client.query(
      `select * from user_events where fk_user = $1`,
      [userId]
    );
    let ems_events = response.data.events;
    const submission_events = await result.rows;
    let finalArr = [];
    masterEvents.forEach((event) => {
      finalArr = setArr(
        ems_events,
        submission_events,
        event.ems_id,
        userId,
        finalArr
      );
    });
    if (finalArr?.length > 0) {
      const query = `INSERT into user_events (ems_id, name, description, type, mode, is_active, play, tagline, logo, start_time, end_time, fk_user, created_at, updated_at) VALUES %L`;
      await client.query(format(query, finalArr));
    }
  } catch (err) {
    console.log(err);
  }
};


 
module.exports = fetchEvents;
