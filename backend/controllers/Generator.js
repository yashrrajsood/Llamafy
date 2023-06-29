// Import required modules
const pool = require("../database/pool");
const { imgGen } = require('./Dalle')
require('dotenv').config();

// Import OpenAI API modules and configure the API key
const { Configuration, OpenAIApi } = require("openai");
const key = process.env.OPEN_AI_KEY;
const configuration = new Configuration({
    apiKey: key,
});
const openAi = new OpenAIApi(configuration);

// Define function to generate outfits
async function generateOutfits(user_email, weatherValues, colorScheme) {
    // Log a message indicating that the function has been called
    console.log(
        "Called Generating outfits function for " +
            user_email +
            ", with color scheme: " +
            colorScheme
    );

    // Extract the temperature and condition values from the weatherValues object
    const weatherVals = {
        temp: weatherValues.tempC,
        condition: weatherValues.condition,
    };

    // Log a message indicating that the function is awaiting the promptGenerator function
    console.log("awaiting promptGenerator");

    // Call the promptGenerator function to generate the prompt
    const prompt = await promptGenerator(user_email, weatherVals, colorScheme);

    // Log a message indicating that the function is awaiting a response from the OpenAI API
    console.log("awaiting response from davinci");

    try {
        // Call the OpenAI API to generate a response
        const response = await openAi.createCompletion({
            model: "text-davinci-003",
            prompt: prompt,
            temperature: 0.2,
            max_tokens: 2047,
            n: 1,
            stop: null,
            echo: false,
        });

        // Extract the response text from the API response
        let responseText = response.data.choices[0].text;
        responseText = responseText.trim();

        try {
            // Log a message indicating that the function is generating DALL-E images
            console.log("Generating DalE Images");

            // Parse the response text as JSON
            let toJson = JSON.stringify(responseText);
            toJson = JSON.parse(responseText);

            // Construct prompts for the DALL-E model
            const dallePrompt1 =
                toJson.recommendation1.dalle + " Hyper Realistic Style";
            const dallePrompt2 =
                toJson.recommendation2.dalle + " Hyper Realistic Style";
            const dallePrompt3 =
                toJson.recommendation3.dalle + " Hyper Realistic Style";

            // Log a message indicating that the function is awaiting DALL-E image generation
            console.log("waiting for dalle");

            // Generate the DALL-E images
            const images = await Promise.all([
                imgGen(dallePrompt1),
                imgGen(dallePrompt2),
                imgGen(dallePrompt3),
            ]);

            // Return the response text and image URLs
            return {
                responseText: responseText,
                imageUrls: [images[0], images[1], images[2]],
            };
        } catch (dalleErr) {
            // Log any errors that occur during DALL-E image generation
            console.log(dalleErr);
        }
    } catch (error) {
        // Log any errors that occur during OpenAI API call
        console.log(error);
    } finally {
        // Log a message indicating that the function has ended
        console.log("end generator");
    }
}


// Define a function to get the user's wardrobe
async function getUserWardrobe(user_email) {
    try {
        // Get a connection to the database
        const conn = await pool.getConnection();
        
        // Query the database for the user's clothing items that have not been worn in the last 2 days
        const rows = await conn.query(
            `SELECT ClothingItem.clothing_id, Category.main_category, Category.sub_category, ClothingItem.color, ClothingItem.sleeves, ClothingItem.pattern, ClothingItem.style, ClothingItem.lastWorn FROM ClothingItem INNER JOIN Users ON ClothingItem.user_email = Users.email INNER JOIN Category ON ClothingItem.category_id = Category.category_id WHERE Users.email = ? AND (ClothingItem.lastWorn IS NULL OR DATEDIFF(NOW(), ClothingItem.lastWorn) > 2)`,
            [user_email]
        );
        
        // Release the database connection
        conn.release();

        // Initialize an empty object to hold the clothing items by category
        const clothingItemsByCategory = {};

        // Loop through each row in the query results
        rows[0].forEach((row) => {
            const {
                clothing_id,
                main_category,
                sub_category,
                color,
                sleeves,
                pattern,
                style,
            } = row;

            // If the main category of the clothing item does not exist in the object, create an empty array for it
            if (!clothingItemsByCategory[main_category]) {
                clothingItemsByCategory[main_category] = [];
            }

            // Push the clothing item data to the array for the main category
            clothingItemsByCategory[main_category].push({
                clothing_id,
                sub_category,
                color,
                sleeves,
                pattern,
                style,
            });
        });

        // Return the clothing items by category
        return clothingItemsByCategory;
    } catch (err) {
        throw err;
    }
}

// Define a function to get the user's gender and skin tone from the database
async function getUserData(user_email) {
    // Get a connection to the database
    const conn = await pool.getConnection();

    try {
        // Query the database for the user's gender and skin tone
        const [rows] = await conn.query(
            "SELECT gender, skinTone FROM Users WHERE email = ?",
            [user_email]
        );

        // If no rows were returned from the query, throw an error
        if (!rows.length) {
            throw new Error(`User with email ${user_email} not found`);
        }

        // Construct a string describing the user's gender and skin tone
        const s = `${rows[0]["gender"]} with a ${rows[0]["skinTone"]} skin tone`;

        // Return the string
        return s;
    } catch (error) {
        throw error;
    } finally {
        // Release the database connection
        conn.release();
    }
}

async function promptGenerator(user_email, weatherValsObj, colorScheme) {
    // if the weather API endpoint cannot be reached upstream, assume good weather
    if (
        weatherValsObj.temp == undefined ||
        weatherValsObj.condition == undefined
    ) {
        weatherValsObj.temp = 20;
        weatherValsObj.condition = "fine";
    }

    // console.log(weatherValsObj);
    

    // Get the user data and wardrobe data for that user
    const [userData, userWardrobe] = await Promise.all([
        getUserData(user_email),
        getUserWardrobe(user_email),
    ]);

    // Check if a color was defined and change string based on that
    var colorAddString = "";
    if (colorScheme != undefined) {
        colorAddString = `If possible and if the user's wardrobe permits, try following this color scheme: ${colorScheme}`;
    }

    var prompt = `Given the following JSON of clothes, suggest three outfits to wear today for a ${userData}, given that the temperature outside is ${
        weatherValsObj.temp
    } degrees celsius and ${weatherValsObj.condition}. ${colorAddString}

  ${JSON.stringify(userWardrobe)}
  Respond in the below valid JSON format only, substituting % with the values (do not actually include the % sign if there are no values). Do not provide a value for a category if it is covered by another. In the "dalle" property, provide a comprehensive prompt to give to the DALL-E model, do not give it a hex color, but an actual color name. Focus on providing detail on colour. For the outfitDescription, give a small sentence of what the is included in the outfit, give me the actual color, not the hex
  {
    "recommendation1": {
      "top": [
        {
          "id": "%",
          "description": "%",
          "colour": "%",
          "subCategory": "%"
        }
      ],
      "bottom": [
        {
          "id": "%",
          "description": "%",
          "colour": "%",
          "subCategory": "%"
        }
      ],
      "onePiece": [
        {
          "id": "%",
          "description": "%",
          "colour": "%",
          "subCategory": "%"
        }
      ],
      "shoes": [
        {
          "id": "%",
          "description": "%",
          "colour": "%",
          "subCategory": "%"
        }
      ],
      "dalle": "A full-body lookbook style photograph of a male model wearing %",
      "outfitDescription": "%"
    },
    "recommendation%": {
      "top": "%..."
    }
  }`;

    // console.log(prompt);
    return prompt;
}

async function changeClotheWornDate(clothesIDs) {
    try {
      const conn = await pool.getConnection();
      const now = new Date();
      const updateQuery = `UPDATE ClothingItem SET lastWorn = ? WHERE clothing_id = ?`;
      
      // Loop through the clothesIDs list and execute the update query for each clothing_id
      for (const clothing_id of clothesIDs) {
        const updateResult = await conn.query(updateQuery, [now, clothing_id]);
        console.log(`Updated lastWorn for clothing_id ${clothing_id}`);
      }
      
      conn.release();
    } catch (err) {
      throw err;
    }
  }

module.exports = { generateOutfits, changeClotheWornDate, getUserWardrobe, getUserData, promptGenerator };
