import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODEL = "gemini-2.5-flash";

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server ready on http://localhost:${PORT}`));

app.post("/api/chat", async (req, res) => {
  const { conversation } = req.body;

  try {
    if (!Array.isArray(conversation)) {
      throw new Error("Conversation must be an array!");
    }

    const contents = conversation.map(({ role, text }) => ({
      role: role === "assistant" ? "model" : "user",
      parts: [{ text }],
    }));

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.7,
        systemInstruction: "Jawab hanya dengan bahasa Indonesia, santai dan ramah.",
      },
    });

    const text =
      response.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    res.status(200).json({ result: text });
  } catch (error) {
    console.error("CHAT ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});
