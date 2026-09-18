const fs = require('fs');
const path = require('path');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function savePoem(poemsDir, {
  subject, style, context, provider, model, title, poem,
  promptTokens, completionTokens, totalTokens, cost,
}) {
  fs.mkdirSync(poemsDir, { recursive: true });
  const filename = `${timestamp()}_${slugify(subject) || 'untitled'}.txt`;
  const filePath = path.join(poemsDir, filename);
  const body = [
    `Subject: ${subject}`,
    `Style: ${style}`,
    `Context: ${context || '(none)'}`,
    `Provider: ${provider}`,
    `Model: ${model}`,
    `Prompt Tokens: ${promptTokens ?? 'n/a'}`,
    `Completion Tokens: ${completionTokens ?? 'n/a'}`,
    `Total Tokens: ${totalTokens ?? 'n/a'}`,
    `Cost: ${cost != null ? `$${cost}` : 'n/a'}`,
    `Title: ${title}`,
    '',
    poem,
    '',
  ].join('\n');
  fs.writeFileSync(filePath, body, 'utf8');
  return filePath;
}

module.exports = { savePoem };
