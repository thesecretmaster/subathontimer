const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  saveSettings: (data) => ipcRenderer.send('save-sub-settings', data),
  getSettings: () => ipcRenderer.invoke('get-sub-settings')
});
