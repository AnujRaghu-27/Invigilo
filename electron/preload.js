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
  onFullScreenTransition: (callback) => {
    const subscription = (_event, isTransitioning) => callback(isTransitioning);
    ipcRenderer.on("fullscreen-transition", subscription);
    return () => {
      ipcRenderer.removeListener("fullscreen-transition", subscription);
    };
  },
  setTestActive: (isActive) => ipcRenderer.send("set-test-active", isActive),
  confirmQuit: () => ipcRenderer.invoke("confirm-quit"),
  adminUpdateStatus: (payload) => ipcRenderer.invoke("admin:update-status", payload),
  adminGetRecords: (payload) => ipcRenderer.invoke("admin:get-records", payload),
  onQuitAttempt: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on("quit-attempt", subscription);
    return () => {
      ipcRenderer.removeListener("quit-attempt", subscription);
    };
  },
});
