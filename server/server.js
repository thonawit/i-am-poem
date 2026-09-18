const http = require('http');
const fs = require('fs');
const path = require('path');
const { STYLE_OPTIONS } = require('./prompt');
const { getApiKey, setApiKey, PROVIDERS } = require('./env-store');
const { savePoem } = require('./poem-archive');
const { fetchAllModels, generatePoem } = require('./providers');

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

function createServer(envPath, poemsDir) {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/api/styles') {
        return sendJson(res, 200, { styles: STYLE_OPTIONS });
      }

      if (req.method === 'GET' && req.url === '/api/models') {
        const models = await fetchAllModels();
        return sendJson(res, 200, models);
      }

      if (req.method === 'GET' && req.url === '/api/keys') {
        const keys = {};
        for (const provider of PROVIDERS) {
          const key = getApiKey(envPath, provider);
          keys[provider] = { hasKey: !!key, key };
        }
        return sendJson(res, 200, keys);
      }

      if (req.method === 'POST' && req.url === '/api/keys') {
        const { provider, key } = await readBody(req);
        if (!PROVIDERS.includes(provider)) return sendJson(res, 400, { error: 'Unknown provider' });
        if (!key) return sendJson(res, 400, { error: 'Missing key' });
        setApiKey(envPath, provider, key);
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'POST' && req.url === '/api/generate') {
        const { subject, style, context, provider, model } = await readBody(req);
        if (!PROVIDERS.includes(provider)) return sendJson(res, 400, { error: 'Unknown provider' });
        if (!subject || !style || !model) {
          return sendJson(res, 400, { error: 'subject, style, and model are required' });
        }
        const apiKey = getApiKey(envPath, provider);
        if (!apiKey) return sendJson(res, 400, { error: `No API key saved for ${provider} yet` });

        const result = await generatePoem({ provider, subject, style, context, model, apiKey });
        savePoem(poemsDir, {
          subject,
          style,
          context,
          provider,
          model,
          title: result.title,
          poem: result.poem,
        });
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
