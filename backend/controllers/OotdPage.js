const pool = require('../database/pool');

// DAO to greet the user on the OOTD page with their first name 
async function fetchUserFirstName(email) {
    const conn = await pool.getConnection();
  try {
    const result = await conn.query(
      `select distinct firstName from Users where email = ?`, email,
    );
    return result[0][0].firstName;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = { fetchUserFirstName };