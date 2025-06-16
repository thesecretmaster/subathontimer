const { ipcRenderer } = require('electron');
window.electronAPI = {
  saveSettings: (data) => ipcRenderer.send('save-sub-settings', data),
  getSettings: () => ipcRenderer.invoke('get-sub-settings')
};

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await window.electronAPI.getSettings();
  for (const [k, v] of Object.entries(settings)) {
    const e = document.getElementById(k)
    if (e) e.value = v || ''
  }

  const form = document.getElementById('subathonForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    window.electronAPI.saveSettings(Object.fromEntries(new FormData(form).entries()));
  });
});
