const { ipcRenderer } = require('electron');
window.electronAPI = {
  saveSettings: (data) => ipcRenderer.send('save-sub-settings', data),
  getSettings: () => ipcRenderer.invoke('get-sub-settings')
};

function parseHhMmSs(v) {
  const vs = v.split(':')
  let secs = Number(vs.pop())
  const minutes = vs.pop()
  if (minutes) secs += Number(minutes) * 60
  const hours = vs.pop()
  if (hours) secs += Number(hours) * 60 * 60
  return secs
}

function toHhMmSs(v) {
  const hours = Math.floor(v / (60 * 60))
  const minutes = Math.floor(v / 60) % 60
  const seconds = v % 60
  let str = seconds.toString().padStart(2, '0')
  if (minutes > 0) str = `${hours > 0 ? minutes.toString().padStart(2, '0') : minutes}:${str}`
  if (hours > 0) str = `${hours}:${str}`
  return str
}

document.addEventListener('DOMContentLoaded', async () => {
  const settings = await window.electronAPI.getSettings();
  const form = document.getElementById('subathonForm');
  for (const e of form.elements) {
    let v = settings[e.name]
    if (v) {
      if (e.classList.contains('hhmmss')) v = toHhMmSs(v)
      e.value = v
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form)
    for (const e of form.elements) {
      if (e.classList.contains('hhmmss')) formData.set(e.name, parseHhMmSs(e.value))
    }
    window.electronAPI.saveSettings(Object.fromEntries(formData.entries()));
  });
});
