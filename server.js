import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { handler } from './netlify/functions/gemini-webhook.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 8888;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Simulation of Netlify Function
app.all('/.netlify/functions/gemini-webhook', async (req, res) => {
  const event = {
    httpMethod: req.method,
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  
  try {
    const response = await handler(event);
    res.status(response.statusCode).set(response.headers).send(response.body);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Function simulation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`\n───────────────────────────────────────────────────`);
  console.log(` 🚀 Local test server running!`);
  console.log(` 🌐 Dashboard: http://localhost:${PORT}`);
  console.log(` ⚙️  Webhook:   http://localhost:${PORT}/.netlify/functions/gemini-webhook`);
  console.log(`───────────────────────────────────────────────────\n`);
});
