const { buildPrompt, parsePoemResponse } = require('./prompt');

// Ids that are technically text-in/text-out but aren't general creative-writing
// chat models - safety/content classifiers exist to output a label, not a poem.
const OPENROUTER_EXCLUDE_PATTERN = /guard|safety|moderation/i;

async function fetchOllamaModels() {
  const res = await fetch('https://ollama.com/api/tags');
  if (!res.ok) throw new Error(`ollama.com/api/tags returned ${res.status}`);
  const data = await res.json();
  return data.models
    .map((m) => ({ provider: 'ollama', id: m.name, label: m.name }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function fetchOpenRouterModels() {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  if (!res.ok) throw new Error(`openrouter.ai/api/v1/models returned ${res.status}`);
  const data = await res.json();
  return data.data
    .filter((m) => {
      const isTextOut = Array.isArray(m.architecture?.output_modalities)
        && m.architecture.output_modalities.length === 1
        && m.architecture.output_modalities[0] === 'text';
      const isAlias = m.id.startsWith('~');
      const isClassifier = OPENROUTER_EXCLUDE_PATTERN.test(m.id);
      return isTextOut && !isAlias && !isClassifier;
    })
    .map((m) => ({ provider: 'openrouter', id: m.id, label: m.name || m.id }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

async function fetchAllModels() {
  const [ollama, openrouter] = await Promise.all([
    fetchOllamaModels().catch((err) => {
      console.error('Failed to fetch Ollama models:', err.message);
      return [];
    }),
    fetchOpenRouterModels().catch((err) => {
      console.error('Failed to fetch OpenRouter models:', err.message);
      return [];
    }),
  ]);
  return { ollama, openrouter };
}

async function generateWithOllama({ subject, style, context, model, apiKey }) {
  const prompt = buildPrompt({ subject, style, context });
  const res = await fetch('https://ollama.com/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `ollama.com/api/chat returned ${res.status}`);
  return parsePoemResponse(data?.message?.content || '');
}

async function generateWithOpenRouter({ subject, style, context, model, apiKey }) {
  const prompt = buildPrompt({ subject, style, context });
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `openrouter.ai returned ${res.status}`);
  return parsePoemResponse(data?.choices?.[0]?.message?.content || '');
}

async function generatePoem({ provider, subject, style, context, model, apiKey }) {
  const generator = provider === 'openrouter' ? generateWithOpenRouter : generateWithOllama;
  const { title, poem } = await generator({ subject, style, context, model, apiKey });
  return { title, poem, model, provider };
}

module.exports = { fetchAllModels, generatePoem };
