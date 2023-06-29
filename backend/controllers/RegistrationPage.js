const pool = require('../database/pool');

async function registerUser(data) {
  const conn = await pool.getConnection();
  try {
    // Check if the email already exists
    const emailCheck = await conn.query(
      'SELECT COUNT(*) AS count FROM Users WHERE email = ?',
      [data.email]
    );
    if (emailCheck[0].count > 0) {
      // If the email exists, throw an error
      throw new Error('An account with that email already exists');
    }

    // If the email is unique, insert new user data
    const result = await conn.query(
      'INSERT INTO Users (firstName, lastName, email, password, location, gender) VALUES (?, ?, ?, ?, ?, ?)',
      [data.firstName, data.lastName, data.email, data.password, data.location, data.gender]
    );
    
    return result[0].insertId;
  } catch (error) {
    
    throw error;
  } finally {
    conn.release();
  }
  
}

module.exports = { registerUser };
