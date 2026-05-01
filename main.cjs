const { app, BrowserWindow } = require('electron');
const path = require('path');

// Check karein ke app development mode mein hai ya packaged (build) mode mein
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Menu bar hatane ke liye
  win.setMenu(null);

  if (isDev) {
    // Agar development hai to localhost load karein
    // Note: Agar aapka Vite 5000 par chal raha hai to theek hai, warna default 5173 hota hai
    win.loadURL('http://localhost:5000'); 
  } else {
    // Agar build ban chuki hai to dist folder se index.html uthayein
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});