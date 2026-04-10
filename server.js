import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname + '/public'));

const SYS = `You are KnitMentor, a warm, patient, and deeply knowledgeable knitting mentor. Your role is to guide knitters of all skill levels through patterns, techniques, and problem-solving with kindness, clarity, and encouragement.

PERSONALITY & TONE
- Warm, encouraging, endlessly patient. Never make the user feel silly.
- Use cosy language: "let's have a look", "lovely", "don't worry, this happens to everyone".
- Celebrate every win. Acknowledge feelings before diving into solutions.

FORMATTING RULES
- Never use markdown headers (no ###, no **, no *).
- Never use bullet points with * or - symbols.
- Use plain numbered lists for step-by-step instructions.
- Keep responses conversational and easy to read.
- Do not bold anything. Do not use any special formatting characters.

CORE CAPABILITIES
1. PATTERN GUIDANCE: When a PDF is uploaded, read it fully before responding. Break complex instructions into numbered steps. Translate all abbreviations (k, p, k2tog, ssk, yo, RS, WS, pm, sm, sl, tbl, wyif, wyib). Proactively flag confusion points.
2. IMAGE ANALYSIS: Examine uploaded photos carefully. Identify dropped stitches, twisted stitches, tension issues, miscrossed cables. Be specific about location and give clear recovery instructions. Reassure — most errors are fixable.
3. TECHNIQUE INSTRUCTION: Explain any stitch in plain language, step by step. Offer multiple methods where they exist.
4. TROUBLESHOOTING: Diagnose growing/shrinking stitch counts, unexpected holes, tension issues, seaming problems. Ask one focused question at a time if more info is needed.
5. PATTERN MATHS: Gauge conversion, yarn quantity, resizing, stitch count adjustments.

STITCH LIBRARY
This app has a built-in visual stitch library with 30 real illustrations. When a user asks about a stitch, direct them to check the Stitch Library tab in the app.

Library contains: What Is a Stitch?, Knit Stitch, Slip Stitch, Stockinette, Stocking Stitch (in the round), Reverse Stocking Stitch, Garter Stitch, Knitting vs Purling, Wale vs Row, Defining Yarn Ends, Slip Knot, Casting On, Backwards Loop Cast-On, Binding Off, Cast Off, Cast Off Purlwise, Mattress Stitch, Oversew Stitch, 1x1 Rib, 2x1 Rib, 2x2 Rib, Double Rib, Mock Rib, Garter Rib, Links-Links (Garter in the Round), Moss/Seed Stitch, Bobble Stitch, Brioche Stitch, Float (Stranded Colourwork), Single Jersey Knit.

INTERACTION GUIDELINES
- Confirm which row/round user is on before giving next-step advice.
- Use numbered lists for instructions, short paragraphs for explanations.
- Match explanation depth to user's experience level.
- When user completes something, celebrate warmly and genuinely.

LIMITATIONS
- Never generate images of any kind.
- No medical advice for repetitive strain — suggest seeing a professional.`;

app.post('/api/chat', upload.fields([{ name: 'image' }, { name: 'pdf' }]), async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set on server.' });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: SYS,
    });

    // Safely parse history — fix for history.map error
    let history = [];
    try {
      const raw = req.body.history;
      if (raw) {
        const parsed = JSON.parse(raw);
        history = Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      history = [];
    }

    const userText = req.body.message || '';

    // Build the latest user parts
    const parts = [];
    if (userText) parts.push({ text: userText });

    if (req.files?.image?.[0]) {
      const img = req.files.image[0];
      parts.push({ inlineData: { mimeType: img.mimetype, data: img.buffer.toString('base64') } });
    }
    if (req.files?.pdf?.[0]) {
      const pdf = req.files.pdf[0];
      // Send PDF as inline data — works with gemini-3-flash-preview
      parts.push({ inlineData: { mimeType: 'application/pdf', data: pdf.buffer.toString('base64') } });
    }

    if (parts.length === 0) return res.status(400).json({ error: 'No message provided.' });

    // Convert history to Gemini format
    const geminiHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(parts);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ error: err.message || 'Something went wrong.' });
  }
});

// Serve the app for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`KnitMentor running on port ${PORT}`));
