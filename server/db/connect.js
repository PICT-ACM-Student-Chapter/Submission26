

require('dotenv').config();
const { Client } = require('pg');

// Create a new pool using the environment variables

const client = new Client({
  host:process.env.host,
  database:process.env.database,
  user:process.env.user,
  password:process.env.password,      
  ssl: {            
    rejectUnauthorized: false, // This is important for Neon database connections
  },  
  port:5432  
}); 
 
client.on('connect', () => {
  console.log('Connected to the PostgreSQL database'); 
}); 

// Export the pool for use in other parts of the application
module.exports = client; 
