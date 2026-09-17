const http = require('http');
const fs = require('fs');
const path = require('path');
const { STYLE_OPTIONS, buildPrompt, parsePoemResponse } = require('./prompt');
const { getApiKey, setApiKey } = require('./env-store');
const { savePoem } = require('./poem-archive');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function fetchCloudModels() {
  const res = await fetch('https://ollama.com/api/tags');
  if (!res.ok) throw new Error(`ollama.com/api/tags returned ${res.status}`);
  const data = await res.json();
  return data.models.map((m) => m.name).sort();
}

async function generatePoem({ subject, style, context, model, apiKey }) {
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
  if (!res.ok) {
    throw new Error(data?.error || `ollama.com/api/chat returned ${res.status}`);
  }
  const raw = data?.message?.content || '';
  const { title, poem } = parsePoemResponse(raw);
  return { title, poem, model };
}

function createServer(envPath, poemsDir) {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/api/styles') {
        return sendJson(res, 200, { styles: STYLE_OPTIONS });
      }

      if (req.method === 'GET' && req.url === '/api/models') {
        const models = await fetchCloudModels();
        return sendJson(res, 200, { models });
      }

      if (req.method === 'GET' && req.url === '/api/key') {
        const key = getApiKey(envPath);
        return sendJson(res, 200, { hasKey: !!key, key });
      }

      if (req.method === 'POST' && req.url === '/api/key') {
        const { key } = await readBody(req);
        if (!key) return sendJson(res, 400, { error: 'Missing key' });
        setApiKey(envPath, key);
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'POST' && req.url === '/api/generate') {
        const { subject, style, context, model } = await readBody(req);
        const apiKey = getApiKey(envPath);
        if (!apiKey) return sendJson(res, 400, { error: 'No Ollama API key saved yet' });
        if (!subject || !style || !model) {
          return sendJson(res, 400, { error: 'subject, style, and model are required' });
        }
        const result = await generatePoem({ subject, style, context, model, apiKey });
        savePoem(poemsDir, { subject, style, context, model, title: result.title, poem: result.poem });
        return sendJson(res, 200, result);
      }

      // Static file serving
      let filePath = req.url === '/' ? '/index.html' : req.url;
      filePath = path.join(PUBLIC_DIR, filePath);
      if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: 'Forbidden' });
      if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: 'Not found' });
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
  });
}

module.exports = { createServer };
