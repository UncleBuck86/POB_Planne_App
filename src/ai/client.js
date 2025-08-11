// AI Client abstraction for Ollama and OpenAI
// Usage: import { getAIResponse } from './client';

const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'ollama';
const MODEL = import.meta.env.VITE_AI_MODEL || 'llama2';
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const SYSTEM_PROMPT = import.meta.env.VITE_AI_SYSTEM_PROMPT || 'You are an offshore POB (Persons On Board) planning assistant. Be concise, actionable, and highlight risks (capacity overages, logistics conflicts).';

async function getAIResponse(prompt) {
  if (PROVIDER === 'ollama') {
    return ollamaRequest(prompt);
  } else if (PROVIDER === 'openai') {
    return openaiRequest(prompt);
  } else {
    throw new Error('Unknown AI provider');
  }
}

async function ollamaRequest(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt })
  });
  if (!res.ok) throw new Error('Ollama request failed');
  const text = await res.text();
  // Try to extract the first valid JSON object from the response
  const firstJsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!firstJsonMatch) throw new Error('No JSON found in Ollama response');
  const data = JSON.parse(firstJsonMatch[0]);
  return data.response || data.message || '';
}

async function openaiRequest(prompt) {
  if (!OPENAI_KEY) throw new Error('Missing VITE_OPENAI_API_KEY');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: MODEL || 'gpt-4o-mini',
      messages: [ { role: 'user', content: prompt } ],
      temperature: 0.2,
      max_tokens: 400
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('OpenAI error ' + res.status + ': ' + t.slice(0,200));
  }
  const data = await res.json();
  const msg = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  return msg || '';
}

export { getAIResponse };
export const isOpenAI = PROVIDER === 'openai';

// High-level streaming chat interface
export async function streamChat(messages, { onToken, onDone, onError, temperature = 0.2, maxTokens = 400 } = {}) {
  try {
    if (PROVIDER === 'openai') {
      return await openAIStream(messages, { onToken, onDone, temperature, maxTokens });
    }
    // Fallback: non-stream single response for Ollama
    const prompt = messages.filter(m=>m.role==='user').map(m=>m.content).join('\n\n');
    const full = await getAIResponse(prompt);
    onToken && onToken(full);
    onDone && onDone(full);
    return full;
  } catch (e) {
    onError && onError(e);
    throw e;
  }
}

async function openAIStream(messages, { onToken, onDone, temperature, maxTokens }) {
  if (!OPENAI_KEY) throw new Error('Missing VITE_OPENAI_API_KEY');
  const body = {
    model: MODEL || 'gpt-4o-mini',
    messages: prependSystem(messages),
    temperature,
    max_tokens: maxTokens,
    stream: true
  };
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('OpenAI stream error ' + res.status + ': ' + t.slice(0,200));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let accumulated = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split(/\r?\n/).filter(l => l.startsWith('data:'));
    for (const line of lines) {
      const data = line.replace(/^data:\s*/, '');
      if (data === '[DONE]') { onDone && onDone(accumulated.trim()); return accumulated.trim(); }
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content;
        if (token) { accumulated += token; onToken && onToken(token, accumulated); }
      } catch { /* ignore partial */ }
    }
  }
  onDone && onDone(accumulated.trim());
  return accumulated.trim();
}

function prependSystem(messages) {
  if (!messages.length || messages[0].role !== 'system') {
    return [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
  }
  return messages;
}
