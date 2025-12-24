require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {GoogleGenerativeAI} = require("@google/generative-ai");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Gemini setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Health check
app.get("/", (req, res) => {
  res.send("Gemini AI backend running 🚀");
});

// Analyze report
app.post("/analyzeReport", async (req, res) => {
  try {
    const {text} = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({error: "Text is required"});
    }

    const model = genAI.getGenerativeModel({
      model: "models/text-bison-001",
    });

    const prompt = `
You are an academic report reviewer.

You MUST return valid JSON.
You MUST include ALL keys.
If nothing is found, return empty arrays or empty strings.

Return JSON EXACTLY like this:
{
  "issues": [],
  "recommendation": "",
  "guidance": []
}

TEXT:
"""${text}"""
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    // Extract JSON safely
    const jsonText = raw.slice(
        raw.indexOf("{"),
        raw.lastIndexOf("}") + 1,
    );

    const parsed = JSON.parse(jsonText);

    // ✅ Normalize AI output (CRITICAL)
    const safeResponse = {
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      recommendation:
        parsed.recommendation.trim() ?
          parsed.recommendation :
          "No recommendation generated.",
      guidance: Array.isArray(parsed.guidance) ? parsed.guidance : [],
    };

    res.json(safeResponse);
  } catch (err) {
    console.error("Gemini Error:", err);
    res.status(500).json({
      error: "AI analysis failed",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
