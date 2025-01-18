const { ipcRenderer } = require('electron');
window.electronAPI = {
  saveKeys: (data) => ipcRenderer.send('save-keys', data),
  getKeys: () => ipcRenderer.invoke('get-api-keys'),
  refreshTokens: () => ipcRenderer.invoke('regenerate-tokens')
};
