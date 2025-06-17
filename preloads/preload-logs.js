const { ipcRenderer } = require('electron');

ipcRenderer.on('add-log', (event, log) => {
  addLog(log)
})

document.addEventListener('DOMContentLoaded', async () => {
  const logs = await ipcRenderer.invoke('get-logs');
  logs.forEach(log => addLog(log))
})

function msToTs(ms) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  let str = `${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  if (hours > 0) str = `${hours}:${str}`
  return str
}

function logToS(log) {
  return `${msToTs(log.logData.state.ms_remaining)} (${log.logData.state.running ? 'running' : 'paused'})`
}

let prev_log = null;

function addLog(log) {
  const wrap = document.getElementById('logs')
  const row = document.createElement('tr')
  if (log.logType === "timerState") {
    const prefix = `${log.logData.state.last_updated === null ? '(not started)' : new Date(log.logData.state.last_updated).toLocaleString()} (${msToTs(log.logData.state.ms_remaining)})`
    let cts = null;
    if (prev_log === null) {
      cts = `Started with timer at ${logToS(log)}`
    } else {
      if (prev_log.logData.state.running !== log.logData.state.running) {
        if (log.logData.state.running && log.logData.state.ms_remaining === prev_log.logData.state.ms_remaining) {
          cts = 'Timer resumed'
        } else if (!log.logData.state.running) {
          cts = 'Timer paused'
        }
      } else {
        if (log.logData.state.running) {
          const timeElapsed = new Date(log.logData.state.last_updated).getTime() - new Date(prev_log.logData.state.last_updated).getTime();
          const timerDiff = log.logData.state.ms_remaining + timeElapsed - prev_log.logData.state.ms_remaining;
          cts = `${msToTs(Math.abs(timerDiff))} ${timerDiff >= 0 ? 'added' : 'removed'}`
        } else {
          const remainingDiff = log.logData.state.ms_remaining - prev_log.logData.state.ms_remaining;
          cts = `${msToTs(Math.abs(remainingDiff))} ${remainingDiff >= 0 ? 'added' : 'removed'}`
        }
      }
    }
    let suffix = null;
    if (log.logData.metadata !== null) {
      if (log.logData.metadata.type === 'sub') {
        suffix = `T${log.logData.metadata.event.tier / 1000} sub, ${log.logData.metadata.multiplier}x multiplier`
        if (log.logData.metadata.randomHour) suffix = `${suffix}, GAY`
      } else if (log.logData.metadata.type === 'bits') {
        suffix = `${log.logData.metadata.event.bits} bits, ${log.logData.metadata.multiplier}x multiplier`
      }
    }
    if (cts !== null) {
      let v = `${prefix}: ${cts}`
      if (suffix !== null) v = `${v} (${suffix})`
      row.textContent = v
    } else {
      row.textContent = JSON.stringify(log)
    }
    prev_log = log
  } else if (log.logType === 'process') {
    if (log.event === 'start') {
      row.textContent = `${new Date(log.timestamp).toLocaleString()}: Program started`
    } else if (log.event === 'exit') {
      row.textContent = `${new Date(log.timestamp).toLocaleString()}: Program stopped`
    } else {
      row.textContent = JSON.stringify(log)
    }
  } else if (log.logType === 'connection') {
    if (log.state === 'bad') {
      row.textContent = `${new Date(log.timestamp).toLocaleString()}: Potential connection problems began`
    } else if (log.state === 'good') {
      row.textContent = `${new Date(log.timestamp).toLocaleString()}: Connection problems resolved`
    } else {
      row.textContent = JSON.stringify(log)
    }
  } else {
    row.textContent = JSON.stringify(log)
  }
  wrap.prepend(row)
}
