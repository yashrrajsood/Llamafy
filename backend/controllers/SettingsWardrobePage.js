const pool = require("../database/pool");

async function getWardrobeItems(userEmail) {
  try {
    const conn = await pool.getConnection();
    const result = await conn.query(
      `SELECT ci.clothing_id, ci.color, ci.sleeves, ci.pattern, ci.style, c.main_category, c.sub_category
            FROM ClothingItem ci, Category c
            WHERE ci.category_id = c.category_id
            AND ci.user_email = "${userEmail}"`
    );
    conn.release();
    return result[0];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function deleteWardrobeItem(itemId) {
  try {
    const conn = await pool.getConnection();
    await conn.query(`
        DELETE FROM ClothingItem
        WHERE clothing_id='${itemId}'`);
    conn.release();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

module.exports = { getWardrobeItems, deleteWardrobeItem };
