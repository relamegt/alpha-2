const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const apiKey = process.env.GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imagePath = "C:\\Users\\dangu\\.gemini\\antigravity\\brain\\217c68ad-e4bd-458e-9004-909635da2074\\media__1777741417105.png";
    const imagePart = {
      inlineData: {
        data: Buffer.from(fs.readFileSync(imagePath)).toString("base64"),
        mimeType: "image/png"
      },
    };

    const prompt = "Describe the EXACT UI layout of this course card. Where is the image? Where is the title, description, progress bar, rating, button? Give me the exact positioning of the button and its size/shape/color. I need to recreate this layout exactly.";
    const result = await model.generateContent([prompt, imagePart]);
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}
run();
