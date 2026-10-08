const { spawn } = require('child_process');
const os = require('os');
const { buildPrompt, parsePoemResponse } = require('./prompt');

// Anthropic models run through the local Claude Code CLI so they bill Mike's Max
// plan, not an API key. Only works on a machine where `claude` is logged in.
const ANTHROPIC_MODELS = [
  { provider: 'anthropic', id: 'claude-fable-5-1', label: 'Claude Fable 5.1' },
  { provider: 'anthropic', id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { provider: 'anthropic', id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { provider: 'anthropic', id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
];

// API list prices, $ per million tokens in/out (Oct 2026). The CLI's own
// total_cost_usd doesn't know newer models, so cost is computed here.
const ANTHROPIC_PRICES = {
  'claude-fable-5-1': [10, 50],
  'claude-opus-5-5': [4, 20],
  'claude-sonnet-5-5': [2, 10],
  'claude-haiku-5-5': [0.1, 0.5],
};

// Strips Claude Code down to a bare model call: no tools, MCP servers, skills,
// or user-level settings/hooks. Without these a poem costs ~60K prompt tokens.
const CLAUDE_ARGS = [
  '--output-format', 'json',
  '--system-prompt', '"You are a master poet."',
  '--tools', '""',
  '--setting-sources', 'project',
  '--strict-mcp-config',
  '--disable-slash-commands',
];

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
  return { ollama, openrouter, anthropic: ANTHROPIC_MODELS };
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
  return {
    ...parsePoemResponse(data?.message?.content || ''),
    promptTokens: data?.prompt_eval_count ?? null,
    completionTokens: data?.eval_count ?? null,
    totalTokens: (data?.prompt_eval_count ?? 0) + (data?.eval_count ?? 0) || null,
    cost: null, // Ollama's API doesn't report a dollar cost
  };
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
  return {
    ...parsePoemResponse(data?.choices?.[0]?.message?.content || ''),
    promptTokens: data?.usage?.prompt_tokens ?? null,
    completionTokens: data?.usage?.completion_tokens ?? null,
    totalTokens: data?.usage?.total_tokens ?? null,
    cost: data?.usage?.cost ?? null,
  };
}

function generateWithAnthropic({ subject, style, context, model }) {
  if (!ANTHROPIC_MODELS.some((m) => m.id === model)) {
    return Promise.reject(new Error(`Unknown Anthropic model: ${model}`));
  }
  const prompt = buildPrompt({ subject, style, context });
  return new Promise((resolve, reject) => {
    // shell:true so Windows finds claude.cmd; args are fixed and the model is
    // whitelisted above, and the prompt goes over stdin, so nothing user-typed hits the shell.
    const child = spawn('claude', ['-p', '--model', model, ...CLAUDE_ARGS], {
      cwd: os.tmpdir(),
      shell: true,
      windowsHide: true,
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => reject(new Error(`Could not start Claude Code: ${e.message}`)));
    child.on('close', (code) => {
      let data;
      try {
        data = JSON.parse(out);
      } catch {
        return reject(new Error(`Claude Code exited ${code}: ${(err || out).trim().slice(0, 300)}`));
      }
      if (data.is_error) return reject(new Error(data.result || 'Claude Code returned an error'));
      const u = data.usage || {};
      const promptTokens = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
        + (u.cache_creation_input_tokens ?? 0) || null;
      const completionTokens = u.output_tokens ?? null;
      resolve({
        ...parsePoemResponse(data.result || ''),
        promptTokens,
        completionTokens,
        totalTokens: (promptTokens ?? 0) + (completionTokens ?? 0) || null,
        // What the API would have charged; on the Max plan nothing is billed.
        cost: Number((((promptTokens ?? 0) * ANTHROPIC_PRICES[model][0]
          + (completionTokens ?? 0) * ANTHROPIC_PRICES[model][1]) / 1e6).toFixed(6)),
        maxPlan: true,
      });
    });
    child.stdin.end(prompt);
  });
}

const GENERATORS = {
  ollama: generateWithOllama,
  openrouter: generateWithOpenRouter,
  anthropic: generateWithAnthropic,
};

async function generatePoem({ provider, subject, style, context, model, apiKey }) {
  const generator = GENERATORS[provider];
  const result = await generator({ subject, style, context, model, apiKey });
  return { ...result, model, provider };
}

module.exports = { fetchAllModels, generatePoem };
