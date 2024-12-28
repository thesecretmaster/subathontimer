const { ipcRenderer } = require('electron');
window.electronAPI = {
  saveSettings: (data) => ipcRenderer.send('save-sub-settings', data),
  getSettings: () => ipcRenderer.invoke('get-sub-settings')
};
