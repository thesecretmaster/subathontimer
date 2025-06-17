const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  saveApiConfig: (keys) => ipcRenderer.send('save-api-config', keys),
  getApiConfig: async () => await ipcRenderer.invoke('get-api-config'),
})
