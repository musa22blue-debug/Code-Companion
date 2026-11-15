const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1250, height: 850, minWidth: 1000, minHeight: 700,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#09090B', symbolColor: '#ffffff', height: 40 },
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.on('update-titlebar', (event, { color, symbolColor }) => {
    if (mainWindow) {
        mainWindow.setTitleBarOverlay({ color: color, symbolColor: symbolColor, height: 40 });
    }
});

ipcMain.handle('run-python', async (event, code) => {
  return new Promise((resolve) => {
    const tempFile = path.join(os.tmpdir(), `cc_script_${Date.now()}.py`);
    fs.writeFileSync(tempFile, code);
    exec(`python "${tempFile}"`, { timeout: 10000 }, (error, stdout, stderr) => {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      if (error) {
        resolve({ output: error.killed ? "Error: Timed out." : stderr || error.message, isError: true });
      } else {
        resolve({ output: stdout || "Code ran successfully (no output).", isError: false });
      }
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});