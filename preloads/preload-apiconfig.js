const { ipcRenderer } = require('electron');
window.electronAPI = {
  saveKeys: (data) => ipcRenderer.send('save-keys', data),
  getKeys: () => ipcRenderer.invoke('get-api-keys'),
  refreshTokens: () => ipcRenderer.invoke('regenerate-tokens')
};

document.addEventListener('DOMContentLoaded', async () => {
  // Retrieve saved keys
  const { twitchUsername, twitchClientId, twitchClientSecret } = await window.electronAPI.getKeys();
  document.getElementById('twitchUsername').value = twitchUsername || '';
  document.getElementById('twitchClientId').value = twitchClientId || '';
  document.getElementById('twitchClientSecret').value = twitchClientSecret || '';

  const form = document.getElementById('apiForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const keys = {
      twitchUsername: document.getElementById('twitchUsername').value,
      twitchClientId: document.getElementById('twitchClientId').value,
      twitchClientSecret: document.getElementById('twitchClientSecret').value
    };
    window.electronAPI.saveKeys(keys);

    ipcRenderer.send('save-api-config', keys);
  })
});
