electronAPI.onChangeMultiplier((multi) => {
    const hypeE = document.getElementById('hypeMulti');
    const overrideE = document.getElementById('overrideMulti');
    hypeE.textContent = `(${multi.hype_train}x)`
    if (multi.override === null) {
        hypeE.style.textDecoration = ''
        overrideE.textContent = ''
    } else {
        hypeE.style.textDecoration = 'line-through'
        overrideE.textContent = `(${multi.multiplier}x)`
    }
});

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
    window.electronAPI.clearMultiplier();
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
