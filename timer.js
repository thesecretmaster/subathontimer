const { ipcRenderer } = require('electron');

let timerElement;
let remainingSeconds = 0;
let multiplier = 1;
let interval = null;
let running = false;
let adjustmentInterval = null;
let displayTimeout = null; // For managing the display timing
let displayQueue = []; 

document.addEventListener('DOMContentLoaded', () => {
    timerElement = document.getElementById("subTimer");
    createAdditionDisplayElement();
});

ipcRenderer.on('add-time', (event, secondsToAdd, subSettings, isSub) => {
    var isFromControl = false;

    if (subSettings === null)
        isFromControl = true;

    // Random multiplier logic
    var rand = Math.random();
    var multi = multiplier;
    let color = "#90EE90";

    if (!isFromControl && isSub) {
        // "Shiny" logic
        if (rand <= subSettings.oddsForMultiplier) {
            multi += subSettings.amountForMultiplier;
            color = "yellow"; 
        }

        // Hour addition
        rand = Math.random();
        if (rand <= subSettings.randomHourChance) {
            secondsToAdd = 3600;
            color = "rainbow";
        }
    }

    secondsToAdd = Math.trunc(Number(secondsToAdd));
    if (secondsToAdd > 0) {
        if(secondsToAdd > 10)
            displayTimeAdded(secondsToAdd * multiplier, color);

        adjustTimer(Number(secondsToAdd * multiplier));
    } else {
        adjustTimer(Number(secondsToAdd));
    }
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

function displayTimeAdded(seconds, color) {
    displayQueue.push({ seconds, color });

    if (!displayTimeout) {
        processDisplayQueue();
    }
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


function processDisplayQueue() {
    if (displayQueue.length === 0) {
        displayTimeout = null;
        return;
    }

    const { seconds, color } = displayQueue.shift();
    const displayElement = document.getElementById("timeAdditionDisplay");

    const formattedTime = formatTime(seconds);

    displayElement.innerText = `+${formattedTime}`;
    displayElement.style.color = color === "rainbow" ? "transparent" : color;
    displayElement.style.backgroundImage =
        color === "rainbow"
            ? "linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)"
            : "none";
    displayElement.style.webkitBackgroundClip =
        color === "rainbow" ? "text" : "none";
    displayElement.style.backgroundClip = color === "rainbow" ? "text" : "none";

    displayElement.style.display = "block";
    displayElement.style.opacity = "1";

    displayTimeout = setTimeout(() => {
        displayElement.style.opacity = "0";

        setTimeout(() => {
            displayElement.style.display = "none";
            processDisplayQueue();
        }, 500);
    }, 2000);
}
