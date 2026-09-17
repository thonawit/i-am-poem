# I Am Poem

A desktop app that generates a poem from a subject, a style, and some context — then
lets you pick which AI model writes it. Same prompt, any model, so you can actually
compare how different LLMs handle creative writing instead of just taking one
model's word for it.

## Why

Most "AI poem generator" tools bake in one model and call it a day. This one flips
that around: the model is just another dropdown. Run the same subject through six
different models back to back and you'll see real differences in voice, cliché
density, and how well each one actually follows the style you asked for.

## Features

- **Twenty style presets** — everything from a classic sonnet to "error message
  poetry where the subject is treated as a system malfunction."
- **Model picker, always current** — the dropdown is pulled live from Ollama's
  cloud model catalog on every launch, so it never goes stale as models are added
  or retired.
- **One file per poem** — every generation is saved to a `poems/` folder with the
  subject, style, context, model, title, and poem text, so you can build up a real
  archive to compare across runs.
- **No server to run yourself** — it talks directly to Ollama's cloud API, so
  there's no local Ollama install required.

## Getting started

1. **Install and run**
   ```bash
   npm install
   npm start
   ```
2. **Get an Ollama API key** at [ollama.com/settings/keys](https://ollama.com/settings/keys).
3. **Paste it into the app** the first time it opens. It's saved to a local `.env`
   file so you only have to do this once — the key never leaves your machine except
   to authenticate directly with Ollama.

## Building a desktop installer

```bash
npm run electron:build
```

Produces a Windows installer in `release/`.

## How it works

- `electron/main.js` — starts the app, spins up a local HTTP server on a random
  free port (so it never collides with anything else running on your machine),
  and opens the window.
- `server/server.js` — the whole backend: serves the UI, proxies the live model
  list from `ollama.com/api/tags`, and calls `ollama.com/api/chat` to generate.
- `server/prompt.js` — the master prompt and the twenty style options.
- `server/env-store.js` — reads/writes the `.env` file that holds your API key.
- `server/poem-archive.js` — writes each generated poem to its own text file.

## Privacy

Your API key is stored only in a local `.env` file (or your OS user-data folder
once installed) and sent only to `ollama.com`. Nothing else is collected, logged,
or transmitted anywhere.

## License

Personal / educational use. Not affiliated with Ollama.
