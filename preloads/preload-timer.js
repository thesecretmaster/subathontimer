const { ipcRenderer } = require('electron');

window.electronAPI = {
    getSettings: () => ipcRenderer.invoke('get-sub-settings')
  };
  