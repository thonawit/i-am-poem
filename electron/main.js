const { app, BrowserWindow } = require('electron');
const path = require('path');
const { createServer } = require('../server/server');

const isProd = app.isPackaged;

// In production, the .env lives next to the user's writable app data (Program
// Files isn't reliably writable). In development, it lives in the project
// root so it behaves like a normal dotenv-based node app.
const ENV_PATH = isProd
  ? path.join(app.getPath('userData'), '.env')
  : path.join(__dirname, '..', '.env');

const POEMS_DIR = isProd
  ? path.join(app.getPath('userData'), 'poems')
  : path.join(__dirname, '..', 'poems');

let mainWindow;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: 'I Am Poem',
    webPreferences: {
      contextIsolation: true,
    },
  });
  mainWindow.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(() => {
  const server = createServer(ENV_PATH, POEMS_DIR);
  // Port 0 = let the OS assign a free ephemeral port, so this never collides
  // with anything else already running on the machine.
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    createWindow(port);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(server.address().port);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
