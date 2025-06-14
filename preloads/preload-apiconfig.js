const { ipcRenderer } = require('electron');
window.electronAPI = {
  saveKeys: (data) => ipcRenderer.send('save-keys', data),
  getKeys: () => ipcRenderer.invoke('get-api-keys'),
  refreshTokens: () => ipcRenderer.invoke('regenerate-tokens')
};

document.addEventListener('DOMContentLoaded', async () => {
  // Retrieve saved keys
  const config = await window.electronAPI.getKeys();
  document.getElementById('twitchUsername').value = config.twitchUsername || '';
  document.getElementById('twitchClientId').value = config.twitchClientId || '';
  document.getElementById('twitchClientSecret').value = config.twitchClientSecret || '';

  const form = document.getElementById('apiForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const keys = {
      twitchUsername: document.getElementById('twitchUsername').value,
      twitchClientId: document.getElementById('twitchClientId').value,
      twitchClientSecret: document.getElementById('twitchClientSecret').value
    };
    ipcRenderer.send('save-api-config', keys);
  })
});
