function startTimer() {
    window.electronAPI.startTimer();
}

function pauseTimer() {
    window.electronAPI.pauseTimer();
}

function clearTimer() {
    window.electronAPI.clearTimer();
}

function skipAnimation() {
    window.electronAPI.skipAnimation();
}

function startMultiplier() {
   const field = document.getElementById("multiplier")
    if (field.reportValidity()) window.electronAPI.startMultiplier(field.value);
}

function stopMultiplier() {
    window.electronAPI.startMultiplier(1);
}

function parseHhMmSs(v) {
  const vs = v.split(':')
  let secs = Number(vs.pop())
  const minutes = vs.pop()
  if (minutes) secs += Number(minutes) * 60
  const hours = vs.pop()
  if (hours) secs += Number(hours) * 60 * 60
  return secs
}

function changeTime(multiplier) {
    const field = document.getElementById("timeAdjustment")
    if (!field.reportValidity()) return
    const v = parseHhMmSs(field.value)
    if (Number.isFinite(v)) window.electronAPI.addTime(v * multiplier)
    field.reportValidity();
}

function addTime() {
    changeTime(1)
}

function removeTime() {
    changeTime(-1)
}
