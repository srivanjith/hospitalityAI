const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

async function main() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || '127.0.0.1',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'hospitalityAI'
    });
    
    console.log('Connected to MySQL successfully!');
    
    const [rows] = await connection.query('DESCRIBE bookings;');
    console.log('Bookings columns:');
    console.table(rows);
    
    await connection.end();
  } catch (err) {
    console.error('Error querying schema:', err);
  }
}

main();
