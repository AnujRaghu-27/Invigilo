const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  enterFullScreen: () => ipcRenderer.invoke("enter-fullscreen"),
  exitFullScreen: () => ipcRenderer.invoke("exit-fullscreen"),
  checkFullScreen: () => ipcRenderer.invoke("check-fullscreen"),
  isFullScreen: () => ipcRenderer.invoke("check-fullscreen"),
  onFullScreenChange: (callback) => {
    const subscription = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on("fullscreen-change", subscription);
    return () => {
      ipcRenderer.removeListener("fullscreen-change", subscription);
    };
  },
});
