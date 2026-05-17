const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const tools = require('./assistantToolsController');

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

const functionDeclarations = [
  {
    name: 'searchCommunities',
    description: 'Search public or private communities by name fragment. Returns up to 20 matches.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        q: { type: SchemaType.STRING, description: 'Search query (community name fragment).' },
        type: { type: SchemaType.STRING, description: 'Optional filter: "public", "private", or "all" (default).' },
      },
      required: ['q'],
    },
  },
  {
    name: 'getCommunity',
    description: 'Get full details of a specific community by its ID, including a sample of recent posts.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: 'Community ObjectId.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'searchUsers',
    description: 'Search MarketHub users by username fragment.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        q: { type: SchemaType.STRING, description: 'Username fragment.' },
      },
      required: ['q'],
    },
  },
  {
    name: 'getUser',
    description: 'Get a user profile summary by exact username.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        username: { type: SchemaType.STRING, description: 'Exact username.' },
      },
      required: ['username'],
    },
  },
  {
    name: 'searchTopics',
    description: 'Search discussion topics by name or description. Pass empty q to list all topics.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        q: { type: SchemaType.STRING, description: 'Topic name or description fragment.' },
      },
    },
  },
  {
    name: 'getTopicPosts',
    description: 'List the most recent PostReddit entries inside a discussion topic.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        slug: { type: SchemaType.STRING, description: 'Topic slug (e.g. "crypto", "forex").' },
        limit: { type: SchemaType.NUMBER, description: 'Max posts to return (default 10, max 25).' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'getLatestNews',
    description: 'Get the most recent financial news headlines.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: { type: SchemaType.NUMBER, description: 'Max headlines (default 10, max 25).' },
      },
    },
  },
  {
    name: 'getCalendar',
    description: 'Get economic calendar releases (CPI, NFP, GDP, etc.) between two dates. Default range: next 7 days.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        from: { type: SchemaType.STRING, description: 'YYYY-MM-DD start date.' },
        to: { type: SchemaType.STRING, description: 'YYYY-MM-DD end date.' },
      },
    },
  },
];

const toolImpl = {
  searchCommunities: tools.searchCommunities,
  getCommunity: tools.getCommunity,
  searchUsers: tools.searchUsers,
  getUser: tools.getUser,
  searchTopics: tools.searchTopics,
  getTopicPosts: tools.getTopicPosts,
  getLatestNews: tools.getLatestNews,
  getCalendar: tools.getCalendar,
};

const MAX_TOOL_ITERATIONS = 6;

exports.chat = async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ success: false, message: 'Gemini API key not configured', code: 500 });
    }

    const { messages, marketContext, attachedContext } = req.body || {};
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

    let effectiveSystemPrompt = systemPrompt;
    if (marketContext && typeof marketContext === 'object') {
      const parts = [];
      if (marketContext.calendar && Array.isArray(marketContext.calendar.items) && marketContext.calendar.items.length) {
        const items = marketContext.calendar.items.slice(0, 60);
        parts.push(`Economic calendar already loaded in the user's browser (captured ${new Date(marketContext.calendar.capturedAt).toISOString()}):\n${JSON.stringify(items)}`);
      }
      if (marketContext.news && Array.isArray(marketContext.news.items) && marketContext.news.items.length) {
        const items = marketContext.news.items.slice(0, 25);
        parts.push(`Financial news already loaded in the user's browser (captured ${new Date(marketContext.news.capturedAt).toISOString()}):\n${JSON.stringify(items)}`);
      }
      if (parts.length) {
        effectiveSystemPrompt = `${systemPrompt}\n\n---\n\nCurrent user session snapshot — prefer using this data over calling getCalendar/getLatestNews tools when the user asks about news or upcoming economic events covered here:\n\n${parts.join('\n\n')}`;
      }
    }

    if (attachedContext && typeof attachedContext === 'object') {
      const safe = {
        title: attachedContext.title,
        subtitle: attachedContext.subtitle,
        fields: Array.isArray(attachedContext.fields) ? attachedContext.fields : [],
        data: attachedContext.data,
      };
      effectiveSystemPrompt = `${effectiveSystemPrompt}\n\n---\n\nRelease context attached by the user (use this as the primary reference for their question — do not re-query tools for the same release):\n\n${JSON.stringify(safe)}`;
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: effectiveSystemPrompt,
      tools: [{ functionDeclarations }],
    });

    const chat = model.startChat({ history });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let pending = String(last.content || '');

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const streamed = await chat.sendMessageStream(pending);
      const chunks = [];
      for await (const chunk of streamed.stream) {
        const t = chunk.text();
        if (t) chunks.push(t);
      }
      const response = await streamed.response;
      const calls = (typeof response.functionCalls === 'function' ? response.functionCalls() : null) || [];

      if (!calls.length) {
        for (const t of chunks) {
          res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      const functionResponses = [];
      for (const call of calls) {
        const impl = toolImpl[call.name];
        let out;
        if (!impl) {
          out = { error: `Unknown tool: ${call.name}` };
        } else {
          try {
            out = await impl(call.args || {});
          } catch (err) {
            out = { error: err.message || 'Tool execution failed' };
          }
        }
        functionResponses.push({ functionResponse: { name: call.name, response: out } });
      }
      pending = functionResponses;
    }

    res.write(`data: ${JSON.stringify({ text: 'I could not finish that request — too many tool iterations.' })}\n\n`);
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
