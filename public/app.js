const keyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key');
const keyStatus = document.getElementById('key-status');

const form = document.getElementById('poem-form');
const subjectInput = document.getElementById('subject');
const styleSelect = document.getElementById('style');
const contextInput = document.getElementById('context');
const modelSelect = document.getElementById('model');
const generateBtn = document.getElementById('generate');

const output = document.getElementById('output');
const outputTitle = document.getElementById('output-title');
const outputPoem = document.getElementById('output-poem');
const outputModel = document.getElementById('output-model');
const errorEl = document.getElementById('error');

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function clearError() {
  errorEl.classList.add('hidden');
}

async function loadKey() {
  const res = await fetch('/api/key');
  const data = await res.json();
  if (data.hasKey) {
    keyInput.value = data.key;
    keyStatus.textContent = 'Key loaded from saved .env file.';
  }
}

async function loadStyles() {
  const res = await fetch('/api/styles');
  const data = await res.json();
  styleSelect.innerHTML = data.styles
    .map((s) => `<option value="${s.replace(/"/g, '&quot;')}">${s}</option>`)
    .join('');
}

async function loadModels() {
  modelSelect.innerHTML = '<option>Loading models…</option>';
  try {
    const res = await fetch('/api/models');
    const data = await res.json();
    modelSelect.innerHTML = data.models.map((m) => `<option value="${m}">${m}</option>`).join('');
  } catch (err) {
    modelSelect.innerHTML = '<option value="">Failed to load models</option>';
    showError(`Could not load model list: ${err.message}`);
  }
}

saveKeyBtn.addEventListener('click', async () => {
  const key = keyInput.value.trim();
  if (!key) return;
  saveKeyBtn.disabled = true;
  try {
    const res = await fetch('/api/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    keyStatus.textContent = 'Key saved.';
    clearError();
  } catch (err) {
    showError(`Could not save key: ${err.message}`);
  } finally {
    saveKeyBtn.disabled = false;
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  output.classList.add('hidden');
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating…';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: subjectInput.value.trim(),
        style: styleSelect.value,
        context: contextInput.value.trim(),
        model: modelSelect.value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    outputTitle.textContent = data.title;
    outputPoem.textContent = data.poem;
    outputModel.textContent = `Written by ${data.model}`;
    output.classList.remove('hidden');
  } catch (err) {
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate';
  }
});

loadKey();
loadStyles();
loadModels();
