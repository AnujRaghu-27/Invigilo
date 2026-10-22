const { app, BrowserWindow, session } = require("electron");

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
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

app.whenReady().then(() => {
  createWindow();
});