const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const platformContextPath = path.join(__dirname, '..', 'context', 'context-platform.md');
const assistantContextPath = path.join(__dirname, '..', 'context', 'context-assistant.md');

let systemPrompt = '';
try {
  const platform = fs.readFileSync(platformContextPath, 'utf8');
  const assistant = fs.readFileSync(assistantContextPath, 'utf8');
  systemPrompt = `${assistant}\n\n---\n\n${platform}`;
} catch (err) {
  console.error('Failed to load assistant context files:', err.message);
}

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

exports.chat = async (req, res, next) => {
  try {
    if (!genAI) {
      return res.status(500).json({ success: false, message: 'Gemini API key not configured', code: 500 });
    }

    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'messages array is required', code: 400 });
    }

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'user') {
      return res.status(400).json({ success: false, message: 'last message must be from user', code: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({ history });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const result = await chat.sendMessageStream(String(last.content || ''));

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: err.message || 'Assistant error', code: 500 });
    }
    res.write(`data: ${JSON.stringify({ error: err.message || 'Assistant error' })}\n\n`);
    res.end();
  }
};
