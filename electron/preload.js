const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  enterFullScreen: () => ipcRenderer.invoke("enter-fullscreen"),
  exitFullScreen: () => ipcRenderer.invoke("exit-fullscreen"),
  submitTest: () => ipcRenderer.invoke("submit-test"),
  onFullScreenChange: (callback) => {
    const subscription = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on("fullscreen-change", subscription);
    return () => {
      ipcRenderer.removeListener("fullscreen-change", subscription);
    };
  },
  onFullscreenChange: (callback) => {
    const subscription = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on("fullscreen-change", subscription);
    return () => {
      ipcRenderer.removeListener("fullscreen-change", subscription);
    };
  },
});
