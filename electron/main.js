const { app, BrowserWindow, session, ipcMain, Menu } = require("electron");
const path = require("path");

let mainWindow;
let isTestSubmitted = false;

// Remove fullscreen toggle from macOS menus while allowing quit (Cmd+Q)
const setupMenu = () => {
  const template = [
    {
      label: app.name,
      submenu: [{ role: "quit" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Specifically detect native Electron fullscreen changes
  mainWindow.on("enter-full-screen", () => {
    // Hide macOS window controls (traffic light buttons)
    if (process.platform === "darwin") {
      mainWindow.setWindowButtonVisibility(false);
    }
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("fullscreen-change", true);
    }
  });

  mainWindow.on("leave-full-screen", () => {
    // If test is not submitted, prevent exiting by re-entering fullscreen
    if (!isTestSubmitted) {
      setTimeout(() => {
        if (!mainWindow.isDestroyed() && !isTestSubmitted) {
          mainWindow.setFullScreen(true);
        }
      }, 50);
      return;
    }

    // Restore window controls when exiting after test submission
    if (process.platform === "darwin") {
      mainWindow.setWindowButtonVisibility(true);
    }
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("fullscreen-change", false);
    }
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
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win) {
    win.setFullScreen(true);
  }
});

// Handle successful test submission (allows exiting fullscreen)
ipcMain.handle("submit-test", (event) => {
  isTestSubmitted = true;
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win) {
    win.setFullScreen(false);
  }
});

// Handle exiting fullscreen (only permitted after test submission)
ipcMain.handle("exit-fullscreen", (event) => {
  if (isTestSubmitted) {
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (win) {
      win.setFullScreen(false);
    }
  }
});

app.whenReady().then(() => {
  setupMenu();
  createWindow();
});