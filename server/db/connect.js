

require('dotenv').config();
const { Client } = require('pg');

// Create a new pool using the environment variables

const client = new Client({
  host:'ep-yellow-mode-a59vb1i6.us-east-2.aws.neon.tech',
  database: 'submission',
  user: 'submission_owner',
  password:'wWTcFM4U3NmC',
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
