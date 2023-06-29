const pool = require('../database/pool');

// Used in the weatherProxy route to get the user's location for accurate weather conditions
async function fetchUserLocation(email) {
  try {
    const conn = await pool.getConnection();
    const result = await conn.query(
      `select location from Users where email = ?`, email,
    );
    conn.release();
    return result[0][0].location;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = { fetchUserLocation };