const pool = require("../database/pool");

async function addWardrobeItem(data) {
  try {
    const connection = await pool.getConnection();
    const result = await connection.query(
      "INSERT INTO ClothingItem (user_email, category_id, color, style, sleeves, pattern) VALUES (?, ?, ?, ?, ?, ?)",
      [
        data.user_email,
        data.category_id,
        data.color,
        data.style,
        data.sleeves,
        data.pattern,
      ]
    );
    connection.release();
    return result[0].insertId;
  } catch (error) {
    throw error;
  }
}

module.exports = { addWardrobeItem };
