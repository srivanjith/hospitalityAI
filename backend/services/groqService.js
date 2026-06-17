const Groq = require('groq-sdk');

let groqClient = null;

const getClient = () => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      throw new Error('GROQ_API_KEY is not configured in .env');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} model
 * @param {number} maxTokens
 * @returns {Promise<string>} 
 */
const chat = async (messages, model = 'llama-3.3-70b-versatile', maxTokens = 1024) => {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7
  });
  return completion.choices[0]?.message?.content || '';
};

/**
 * @param {string} prompt
 * @param {number} maxTokens
 * @returns {Promise<any>} 
 */
const generateJSON = async (prompt, maxTokens = 4096) => {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: 'You are a data generation assistant. Always respond with valid JSON only — no explanation, no markdown, no code fences. Output raw JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    max_tokens: maxTokens,
    temperature: 0.8
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  
  // Strip any accidental markdown code fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Groq JSON parse error. Raw output:', raw);
    throw new Error(`Groq returned invalid JSON: ${err.message}`);
  }
};

module.exports = { chat, generateJSON };
