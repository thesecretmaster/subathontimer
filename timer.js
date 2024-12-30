const { ipcRenderer } = require('electron');

let timerElement;
let remainingSeconds = 0;
let multiplier = 1;
let interval = null;
let running = false;
let adjustmentInterval = null;

document.addEventListener('DOMContentLoaded', () => {
    timerElement = document.getElementById("subTimer");
});

ipcRenderer.on('add-time', (event, secondsToAdd) => {
    secondsToAdd = Math.trunc(Number(secondsToAdd));
    if (secondsToAdd > 0)
        adjustTimer(Number(secondsToAdd * multiplier));
    else
        adjustTimer(Number(secondsToAdd));
});

ipcRenderer.on('set-start-time', (event, seconds) => {
    if (!running) {
        setTimerTo(Number(seconds));
    }
});

ipcRenderer.on('start-timer', (event) => {
    if (!running) startTimer();
});

ipcRenderer.on('pause-timer', (event) => {
    pauseTimer();
});

ipcRenderer.on('change-multi', (event, value) => {
    multiplier = value;
    console.log(multiplier);
});

ipcRenderer.on('apply-theme', (event, themeCssPath) => {
    let style = document.getElementById("style").href = themeCssPath;
    console.log("theme applied");
});

function setTimerTo(seconds) {
    remainingSeconds = seconds;
    timerElement.innerHTML = convertSecondsToHMS(remainingSeconds);
}

function adjustTimer(secondsToAdd) {
    const newRemainingSeconds = remainingSeconds + secondsToAdd;
    if (adjustmentInterval) clearInterval(adjustmentInterval);

    adjustmentInterval = setInterval(() => {
        if (remainingSeconds < newRemainingSeconds) {
            remainingSeconds++;
            timerElement.innerHTML = convertSecondsToHMS(remainingSeconds);
        } else {
            clearInterval(adjustmentInterval);
        }
    }, 1); // Adjust this value for speed 

    if (newRemainingSeconds < 0) {
        remainingSeconds = 0;
    }
}

function startTimer() {
    if (interval) clearInterval(interval);
    running = true;
    interval = setInterval(() => {
        if (remainingSeconds > 0) {
            remainingSeconds -= 1;
            timerElement.innerHTML = convertSecondsToHMS(remainingSeconds);
        } else {
            clearInterval(interval);
            running = false;
        }
    }, 1000);
}

function pauseTimer() {
    if (interval) {
        clearInterval(interval);
        interval = null;
        running = false;
    }
}

function convertSecondsToHMS(seconds) {
    const hours = Math.floor(seconds / (60 * 60));
    seconds %= 60 * 60;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
