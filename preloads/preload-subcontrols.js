const { ipcRenderer } = require('electron');

window.electronAPI = {
    startTimer: () => ipcRenderer.invoke('start-timer'),
    pauseTimer: () => ipcRenderer.invoke('pause-timer'),
    clearTimer: () => ipcRenderer.invoke('clear-stored-time'),
    startMultiplier: (value) => ipcRenderer.send('start-multi', value),
    addTime: (amount) => ipcRenderer.send('add-time', amount),
    removeTime: (amount) => ipcRenderer.send('remove-time', amount)
  };
