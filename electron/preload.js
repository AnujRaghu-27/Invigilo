const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  enterFullScreen: () => ipcRenderer.invoke("enter-fullscreen"),
});
