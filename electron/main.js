const { app, BrowserWindow, session, ipcMain } = require("electron");
const path = require("path");

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Specifically handle camera permission requests
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      if (
        permission === "media" &&
        (!details.mediaTypes || details.mediaTypes.includes("video"))
      ) {
        return callback(true);
      }
      callback(false);
    }
  );

  // Specifically check camera permission status
  session.defaultSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      if (
        permission === "media" &&
        (!details.mediaTypes || details.mediaTypes.includes("video"))
      ) {
        return true;
      }
      return false;
    }
  );

  mainWindow.loadURL("http://localhost:5173");
};

// Handle fullscreen entry request securely from renderer
ipcMain.handle("enter-fullscreen", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
  if (win) {
    win.setFullScreen(true);
  }
});

app.whenReady().then(() => {
  createWindow();
});