const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    startTimer: () => ipcRenderer.invoke('start-timer'),
    pauseTimer: () => ipcRenderer.invoke('pause-timer'),
    clearTimer: () => ipcRenderer.invoke('clear-stored-time'),
    skipAnimation: () => ipcRenderer.invoke('skip-animation'),
    onChangeMultiplier: (callback) => ipcRenderer.on('change-multiplier', (_event, value) => callback(value)),
    startMultiplier: (value) => ipcRenderer.send('start-multi', value),
    clearMultiplier: () => ipcRenderer.send('clear-multi'),
    addTime: (amount) => ipcRenderer.send('add-time', amount),
    removeTime: (amount) => ipcRenderer.send('remove-time', amount)
});
