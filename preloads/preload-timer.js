const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onWsSetupComplete: (callback) => ipcRenderer.on('ws-setup-complete', (_event) => callback()),
  onWsKeepalive: (callback) => ipcRenderer.on('ws-keepalive', (_event, keepalive_ts) => callback(keepalive_ts)),
  onUpdateTimer: (callback) => ipcRenderer.on('update-timer', (_event, newState, metadata) => callback(newState, metadata)),
  onSkipAnimation: (callback) => ipcRenderer.on('skip-animation', (_event) => callback()),
  onApplyTheme: (callback) => ipcRenderer.on('apply-theme', (event, themeCssPath) => callback(themeCssPath)),
})
