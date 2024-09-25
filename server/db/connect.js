const { Client } = require("pg");
const fs = require("fs");

const configDev = {
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  port: process.env.POSTGRES_PORT,
  // connectionTimeoutMillis: 2000,
  password: process.env.POSTGRES_PASSWORD,
  database: "submission",
};
console.log(process.env.CONN_STRING);
// const configProd = {
//   connectionString: process.env.CONN_STRING,
//   ssl: {
//     rejectUnauthorized: false,
//     ca: fs.readFileSync("ca-certificate.crt").toString(),
//   },
// };

// const configProd = {};s

const client = new Client(
  //process.env.NODE_ENV === "dev" ? configDev : configProd
  configDev
); 

module.exports = client;