const fs = require('fs');
const path = require('path');

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function writeEnvFile(envPath, values) {
  const body = Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, body + '\n', 'utf8');
}

function getApiKey(envPath) {
  return readEnvFile(envPath).OLLAMA_API_KEY || '';
}

function setApiKey(envPath, key) {
  const values = readEnvFile(envPath);
  values.OLLAMA_API_KEY = key;
  writeEnvFile(envPath, values);
}

module.exports = { getApiKey, setApiKey };
