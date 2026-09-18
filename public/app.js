const keyInputs = {
  ollama: document.getElementById('ollama-key'),
  openrouter: document.getElementById('openrouter-key'),
};
const keyStatuses = {
  ollama: document.getElementById('ollama-key-status'),
  openrouter: document.getElementById('openrouter-key-status'),
};

const form = document.getElementById('poem-form');
const subjectInput = document.getElementById('subject');
const styleSelect = document.getElementById('style');
const contextInput = document.getElementById('context');
const modelSelect = document.getElementById('model');
const modelProviderHint = document.getElementById('model-provider-hint');
const generateBtn = document.getElementById('generate');

const output = document.getElementById('output');
const outputTitle = document.getElementById('output-title');
const outputPoem = document.getElementById('output-poem');
const outputModel = document.getElementById('output-model');
const errorEl = document.getElementById('error');

const PROVIDER_LABEL = { ollama: 'Ollama', openrouter: 'OpenRouter' };

function showError(message) {
  errorEl.textContent = message;
  errorEl.classList.remove('hidden');
}

function clearError() {
  errorEl.classList.add('hidden');
}

async function loadKeys() {
  const res = await fetch('/api/keys');
  const data = await res.json();
  for (const provider of Object.keys(keyInputs)) {
    if (data[provider]?.hasKey) {
      keyInputs[provider].value = data[provider].key;
      keyStatuses[provider].textContent = 'Key loaded from saved .env file.';
    }
  }
}

async function loadStyles() {
  const res = await fetch('/api/styles');
  const data = await res.json();
  styleSelect.innerHTML = data.styles
    .map((s) => `<option value="${s.replace(/"/g, '&quot;')}">${s}</option>`)
    .join('');
}

function optionValue(provider, id) {
  return `${provider}::${id}`;
}

function parseOptionValue(value) {
  const [provider, ...rest] = value.split('::');
  return { provider, id: rest.join('::') };
}

async function loadModels() {
  modelSelect.innerHTML = '<option>Loading models…</option>';
  try {
    const res = await fetch('/api/models');
    const { ollama, openrouter } = await res.json();

    const groups = [];
    if (ollama.length) {
      groups.push(
        `<optgroup label="Ollama">${ollama
          .map((m) => `<option value="${optionValue('ollama', m.id)}">${m.label}</option>`)
          .join('')}</optgroup>`
      );
    }
    if (openrouter.length) {
      groups.push(
        `<optgroup label="OpenRouter">${openrouter
          .map((m) => `<option value="${optionValue('openrouter', m.id)}">${m.label}</option>`)
          .join('')}</optgroup>`
      );
    }
    modelSelect.innerHTML = groups.join('') || '<option value="">No models available</option>';
    updateProviderHint();
  } catch (err) {
    modelSelect.innerHTML = '<option value="">Failed to load models</option>';
    showError(`Could not load model list: ${err.message}`);
  }
}

function updateProviderHint() {
  if (!modelSelect.value) {
    modelProviderHint.textContent = '';
    return;
  }
  const { provider } = parseOptionValue(modelSelect.value);
  modelProviderHint.textContent = `Runs via ${PROVIDER_LABEL[provider] || provider}.`;
}

modelSelect.addEventListener('change', updateProviderHint);

for (const provider of Object.keys(keyInputs)) {
  document.getElementById(`save-${provider}-key`).addEventListener('click', async (e) => {
    const key = keyInputs[provider].value.trim();
    if (!key) return;
    const btn = e.target;
    btn.disabled = true;
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      keyStatuses[provider].textContent = 'Key saved.';
      clearError();
    } catch (err) {
      showError(`Could not save ${PROVIDER_LABEL[provider]} key: ${err.message}`);
    } finally {
      btn.disabled = false;
    }
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  output.classList.add('hidden');
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating…';

  try {
    const { provider, id } = parseOptionValue(modelSelect.value);
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: subjectInput.value.trim(),
        style: styleSelect.value,
        context: contextInput.value.trim(),
        provider,
        model: id,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    outputTitle.textContent = data.title;
    outputPoem.textContent = data.poem;
    outputModel.textContent = `Written by ${data.model} via ${PROVIDER_LABEL[data.provider] || data.provider}`;
    output.classList.remove('hidden');
  } catch (err) {
    showError(err.message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate';
  }
});

loadKeys();
loadStyles();
loadModels();
