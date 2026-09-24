require('dotenv').config();
const express = require('express');
const path = require('path');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    })
  : null;

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: openai ? 'live' : 'demo',
    message: openai
      ? 'OpenAI API is connected.'
      : 'Demo mode enabled. Add OPENAI_API_KEY to enable live responses.'
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const sanitizedMessages = messages.map((msg) => ({
      role: msg.role === 'assistant' || msg.role === 'user' ? msg.role : 'user',
      content: String(msg.content || '').trim()
    }));

    if (!openai) {
      const latestUserMessage = [...sanitizedMessages]
        .reverse()
        .find((msg) => msg.role === 'user')?.content || 'Hello';

      return res.json({
        reply: `Demo mode is active. Add your OpenAI API key in the .env file to enable live AI responses.\n\nYou asked: "${latestUserMessage}"`
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-oss-120b',
      messages: sanitizedMessages,
      temperature: 0.7,
      max_tokens: 800
    });

    const reply = completion.choices?.[0]?.message?.content || 'I could not generate a response.';

    return res.json({ reply });
  } catch (error) {
    const message = error?.response?.data?.error?.message || error.message || 'Unknown server error';
    console.error('Chat error:', message);
    return res.status(500).json({ error: message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Chatbot app running at http://localhost:${PORT}`);
  console.log(openai
    ? 'Live AI mode enabled.'
    : 'Demo mode enabled. Set OPENAI_API_KEY in .env to use real responses.');
});
