const { ipcRenderer } = require('electron');

let timerElement;
let remainingSeconds = 0;
var multiplier = 0;
let interval = null;
let running = false;
let adjustmentInterval = null;
let displayQueue = []; // Queue for handling each `add-time` event individually
let processingAddition = false; // To track if an addition is being processed
let last_keepalive = new Date();

let acceptTime = true; // Allows time to be added to the timer

function updateKeepaliveIndicator() {
    if (new Date() - last_keepalive > 90 * 1000) {
        document.getElementById('keepaliveWarn').style.display = 'block'
    } else {
        document.getElementById('keepaliveWarn').style.display = 'none'
    }
}

document.addEventListener('DOMContentLoaded', () => {
    timerElement = document.getElementById("subTimer");
    createAdditionDisplayElement();
    setInterval(updateKeepaliveIndicator, 1000)
});

ipcRenderer.on('ws-keepalive', (keepalive_ts) => {
    last_keepalive = keepalive_ts
    updateKeepaliveIndicator()
})

ipcRenderer.on('add-time', (event, secondsToAdd, subSettings, isSub) => {

    if (!acceptTime)
        return;

    var isFromControl = false;

    if (subSettings === null) isFromControl = true;
    var rand = Math.random();
    var multi = multiplier;
    let displayColor = "#90EE90";
    let timerColor = "";

    if (!isFromControl && isSub) {
        if (rand <= subSettings.oddsForMultiplier) {
            multi += Number(subSettings.amountForMultiplier);
            displayColor = "yellow";
            timerColor = "yellow";
        }

        // Hour addition
        rand = Math.random();
        if (rand <= subSettings.randomHourChance) {
            secondsToAdd = 3600;
            displayColor = "rainbow";
            timerColor = "rainbow";
        }
    }

    if(multi === 0)
    {
        multi = 1;
    }

    secondsToAdd = Math.trunc(Number(secondsToAdd * multi));
    if (secondsToAdd > 0) {
        displayQueue.push({ secondsToAdd, displayColor, timerColor });
        processAddTimeQueue();
    }
});

ipcRenderer.on('set-start-time', (event, seconds) => {
    if (!running) {
        setTimerTo(Number(seconds));
    }
});

ipcRenderer.on('start-timer', (event) => {
    acceptTime = true;
    if (!running) startTimer();
});

ipcRenderer.on('pause-timer', (event) => {
    pauseTimer();
});

ipcRenderer.on('change-multi', (event, value) => {
    multiplier = value;
    console.log(multiplier + "in timer");
});

ipcRenderer.on('apply-theme', (event, themeCssPath) => {
    let style = document.getElementById("style").href = themeCssPath;
    console.log("theme applied");
});

function setTimerTo(seconds) {
    remainingSeconds = seconds;
    timerElement.innerHTML = convertSecondsToHMS(remainingSeconds);
}

function processAddTimeQueue() {
    if (processingAddition || displayQueue.length === 0 || !acceptTime) return;

    const { secondsToAdd, displayColor, timerColor } = displayQueue.shift();
    processingAddition = true;

    const displayElement = document.getElementById("timeAdditionDisplay");
    const newRemainingSeconds = remainingSeconds + secondsToAdd;

    const formattedTime = formatTime(secondsToAdd);
    displayElement.innerText = `+${formattedTime}`;
    applyColorEffects(displayElement, displayColor);

    applyTimerColor(timerColor);

    displayElement.style.display = "block";
    displayElement.style.opacity = "1";

    adjustmentInterval = setInterval(() => {
        if (remainingSeconds < newRemainingSeconds) {
            remainingSeconds++;
            timerElement.innerHTML = convertSecondsToHMS(remainingSeconds);
        } else {
            clearInterval(adjustmentInterval);
            adjustmentInterval = null;

            resetTimerColor();

            displayElement.style.opacity = "0";
            setTimeout(() => {
                displayElement.style.display = "none";
                processingAddition = false;
                processAddTimeQueue();
            }, 500);
        }
    }, 1);
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
            acceptTime = false;
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

function createAdditionDisplayElement() {
    const displayElement = document.createElement("div");
    displayElement.id = "timeAdditionDisplay";
    displayElement.style.position = "absolute";
    displayElement.style.top = "10px";
    displayElement.style.left = "10px";
    displayElement.style.zIndex = "1000";
    displayElement.style.fontSize = "24px";
    displayElement.style.fontWeight = "bold";
    displayElement.style.display = "none";
    displayElement.style.transition = "opacity 0.5s ease";
    document.body.appendChild(displayElement);
}

function applyColorEffects(element, color) {
    if (color === "rainbow") {
        element.style.color = "transparent";
        element.style.backgroundImage =
            "linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)";
        element.style.webkitBackgroundClip = "text";
        element.style.backgroundClip = "text";
    } else {
        element.style.color = color;
        element.style.backgroundImage = "none";
        element.style.webkitBackgroundClip = "none";
        element.style.backgroundClip = "none";
    }
}

function applyTimerColor(color) {
    if (color === "rainbow") {
        timerElement.style.color = "transparent";
        timerElement.style.backgroundImage =
            "linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)";
        timerElement.style.webkitBackgroundClip = "text";
        timerElement.style.backgroundClip = "text";
    } else if (color) {
        timerElement.style.color = color;
        timerElement.style.backgroundImage = "none";
        timerElement.style.webkitBackgroundClip = "none";
        timerElement.style.backgroundClip = "none";
    }
}

function resetTimerColor() {
    timerElement.style.color = "";
    timerElement.style.backgroundImage = "none";
    timerElement.style.webkitBackgroundClip = "none";
    timerElement.style.backgroundClip = "none";
}

function formatTime(seconds) {
    if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    } else if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
    } else {
        return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
    }
}
