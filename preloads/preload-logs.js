const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onAddLog: (callback) => ipcRenderer.on('add-log', (_event, log) => callback(log)),
  getLogs: async () => await ipcRenderer.invoke('get-logs')
})
