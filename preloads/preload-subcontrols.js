const { ipcRenderer } = require('electron');

window.electronAPI = {
    startTimer: () => ipcRenderer.invoke('start-timer'),
    pauseTimer: () => ipcRenderer.invoke('pause-timer'),
    startMultiplier: (value) => ipcRenderer.send('start-multi', value),
    addTime: (amount) => ipcRenderer.send('add-time', amount),
    removeTime: (amount) => ipcRenderer.send('remove-time', amount)
  };