const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  enterFullScreen: () => ipcRenderer.invoke("enter-fullscreen"),
  exitFullScreen: () => ipcRenderer.invoke("exit-fullscreen"),
  onFullScreenChange: (callback) => {
    const subscription = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on("fullscreen-change", subscription);
    return () => {
      ipcRenderer.removeListener("fullscreen-change", subscription);
    };
  },
});
