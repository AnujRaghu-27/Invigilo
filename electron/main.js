const { app, BrowserWindow, session, ipcMain, Menu } = require("electron");
const path = require("path");

let mainWindow;
let isAllowedToExit = false;
let isQuitting = false;

const setupMenu = () => {
  if (process.platform === "darwin") {
    const template = [
      {
        label: app.name,
        submenu: [{ role: "quit" }],
      },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  } else {
    Menu.setApplicationMenu(null);
  }
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("enter-full-screen", () => {
    if (process.platform === "darwin") {
      mainWindow.setWindowButtonVisibility(false);
    }
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("fullscreen-change", true);
    }
  });

  mainWindow.on("leave-full-screen", () => {
    if (isQuitting) return;

    if (process.platform === "darwin") {
      mainWindow.setWindowButtonVisibility(true);
    }
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send("fullscreen-change", false);
    }
  });

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

ipcMain.handle("check-fullscreen", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return win ? win.isFullScreen() : false;
});

ipcMain.handle("enter-fullscreen", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win) {
    isAllowedToExit = false;
    win.setFullScreen(true);
  }
});

ipcMain.handle("exit-fullscreen", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win) {
    isAllowedToExit = true;
    win.setFullScreen(false);
  }
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.whenReady().then(() => {
  setupMenu();
  createWindow();
});