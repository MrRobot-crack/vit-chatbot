import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Setup __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files like index.html
app.use(express.static(__dirname));

const API_URL = "https://api.perplexity.ai/chat/completions";
const API_KEY = process.env.PERPLEXITY_API_KEY;

function fixMessages(messages) {
  if (!Array.isArray(messages)) return [];
  const fixed = [];
  for (let i = 0; i < messages.length; i++) {
    if (i === 0) {
      fixed.push(messages[i]);
    } else {
      const prev = fixed[fixed.length - 1];
      const curr = messages[i];
      if (
        ((prev.role === "user" || prev.role === "tool") && (curr.role === "user" || curr.role === "tool")) ||
        (prev.role === "assistant" && curr.role === "assistant")
      ) continue;
      fixed.push(curr);
    }
  }
  return fixed;
}

// API Endpoint
app.post("/api/chat", async (req, res) => {
  let { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ reply: "Invalid or empty messages array." });
  }

  const systemMessage = {
    role: "system",
    content:
      "You are a helpful assistant specialized in providing information about VIT Bhopal University. When the user sends a casual greeting (like hi, hello, hey, or yo), respond with a brief friendly greeting such as 'Hi! How can I help you today?' Do NOT provide definitions. For all other questions, give helpful and informative answers. When they ask about Courses,talk about VIT Bhopals programs Faculty mention VIT Bhopal professors or faculties Admissions give basic VIT Bhopal admission info College always assume college means VIT Bhopal If you don’t know something or it's not related to VIT Bhopal, say: “I'm here to help with VIT Bhopal-related questions only."
  };

  if (!messages.some((msg) => msg.role === "system")) {
    messages = [systemMessage, ...messages];
  }

  messages = fixMessages(messages);

  const lastRole = messages[messages.length - 1].role;
  if (lastRole !== "user" && lastRole !== "tool") {
    return res.status(400).json({ reply: "Last message must be from user/tool." });
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sonar-pro", // ✅ Replace with working Perplexity model
        messages
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ reply: "API error: " + data.error.message });
    }

    const reply = data.choices?.[0]?.message?.content || "Sorry, no response.";
    res.json({ reply });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ reply: "Internal error. Try again later." });
  }
});

// Serve index.html for root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ VIT Chatbot server running on http://localhost:${PORT}`);
});
