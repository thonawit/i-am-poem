# I Am Poem

A desktop app that generates a poem from a subject, a style, and some context — then
lets you pick which AI model writes it, from either Ollama's cloud models or
OpenRouter's entire catalog. Same prompt, any model, so you can actually compare
how different LLMs handle creative writing instead of just taking one model's word
for it.

## Why

Most "AI poem generator" tools bake in one model and call it a day. This one flips
that around: the model is just another dropdown. Run the same subject through
several different models back to back and you'll see real differences in voice,
cliché density, and how well each one actually follows the style you asked for.

## Features

- **Twenty style presets** — everything from a classic sonnet to "error message
  poetry where the subject is treated as a system malfunction."
- **Two model providers, clearly labeled** — pick from Ollama's cloud models or
  OpenRouter's full catalog (hundreds of models across every major lab), grouped
  separately in the dropdown. The output always says which provider actually wrote
  the poem.
- **Model lists, always current** — both dropdowns are pulled live from each
  provider's API on every launch, so they never go stale as models are added or
  retired. OpenRouter's list is filtered down to text-in/text-out chat models —
  no image/audio generators, no "latest"-alias redirects, no safety/moderation
  classifiers cluttering it up.
- **One file per poem** — every generation is saved to a `poems/` folder with the
  subject, style, context, provider, model, title, and poem text, so you can build
  up a real archive to compare across runs.
- **Token and cost tracking** — every result shows prompt/completion/total token
  counts, plus the actual dollar cost when using OpenRouter (Ollama's API doesn't
  report cost, so that field reads `n/a`). Saved to each poem's file too, so you
  can weigh "best poem" against "best poem per dollar."
- **No server to run yourself** — it talks directly to each provider's cloud API,
  so there's no local Ollama install required.

## Getting started

1. **Install and run**
   ```bash
   npm install
   npm start
   ```
2. **Get an API key** for whichever provider(s) you want to use:
   - Ollama: [ollama.com/settings/keys](https://ollama.com/settings/keys)
   - OpenRouter: [openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)
3. **Paste it into the app** the first time it opens. Each key is saved to its own
   line in a local `.env` file so you only have to do this once — a key never
   leaves your machine except to authenticate directly with the provider it
   belongs to. You only need a key for the provider(s) whose models you actually
   plan to use.

## Building a desktop installer

```bash
npm run electron:build
```

Produces a Windows installer in `release/`.

## How it works

- `electron/main.js` — starts the app, spins up a local HTTP server on a random
  free port (so it never collides with anything else running on your machine),
  and opens the window.
- `server/server.js` — the whole backend: serves the UI, and exposes the model
  list, key storage, and generate endpoints.
- `server/providers.js` — fetches the live model list from both Ollama and
  OpenRouter (filtering OpenRouter down to appropriate chat models), and calls
  whichever provider's chat API the request asks for.
- `server/prompt.js` — the master prompt and the twenty style options.
- `server/env-store.js` — reads/writes the `.env` file that holds your API keys,
  one per provider.
- `server/poem-archive.js` — writes each generated poem to its own text file.

## Privacy

Your API keys are stored only in a local `.env` file (or your OS user-data folder
once installed), and each key is sent only to the provider it belongs to. Nothing
else is collected, logged, or transmitted anywhere.

## License

Personal / educational use. Not affiliated with Ollama or OpenRouter.
