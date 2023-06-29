require('dotenv').config();
const key = process.env.OPEN_AI_KEY;

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({ apiKey: key });
const openai = new OpenAIApi(configuration);

const imgGen = async (prompt) => {
  
  // This will call the DALL-E to generate a 512x512 image of a given prompt
  // Each davinci return prompt contains three DALL-E generation prompts
  // Therefore this is called three times per davinci response
  const response = await openai.createImage({
    prompt: prompt,
    n: 1,
    size: "512x512",
    response_format : "url",
  });

  // Extract the URL from the response
  const genUrl = response.data.data[0].url;
  return genUrl;
}

module.exports = { imgGen };