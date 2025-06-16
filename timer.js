const { ipcRenderer } = require('electron');

let timerElement;
let remainingSeconds = 0;
let adjustmentInterval = null;
let processingAddition = false; // To track if an addition is being processed
let last_keepalive = new Date();
let skipAnimation = false;

function updateKeepaliveIndicator() {
    if (new Date() - last_keepalive > 30 * 1000) {
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

ipcRenderer.on('ws-keepalive', (event, keepalive_ts) => {
    last_keepalive = keepalive_ts
    updateKeepaliveIndicator()
})

const stateQueue = [];
let currentState = null;

ipcRenderer.on('update-timer', (event, newState, metadata) => {
    stateQueue.push([newState, metadata])
    processStateQueue()
})

function currentSecondsRemaining(state = null) {
    if (state === null) state = currentState;
    let v;
    if (state === null) {
        return null
    } else if (state.last_updated === null) {
        v = state.seconds_remaining
    } else if (state.running) {
        v = state.seconds_remaining - Math.round((new Date() - state.last_updated) / 1000)
    } else {
        v = state.seconds_remaining
    }
    return v >= 0 ? v : 0
}

function processStateQueue() {
    if (processingAddition || stateQueue.length === 0) return;

    const [newState, metadata] = stateQueue.shift();
    console.log("Processing state queue element", newState, metadata)
    processingAddition = true;

    if (currentState === null) {
        currentState = newState
        timerElement.textContent = convertSecondsToHMS(currentSecondsRemaining());
        processingAddition = false;
        return
    }

    const displayElement = document.getElementById("timeAdditionDisplay");

    let displayColor = "#90EE90";
    let timerColor = "";
    if (metadata) {
        if (metadata.randomMulti) {
            displayColor = "yellow"
            timerColor = "yellow"
        }
        if (metadata.randomHour) {
            displayColor = "rainbow"
            timerColor = "rainbow"
        }

        if (metadata.secondsAdded) {
            const formattedTime = formatTime(metadata.secondsAdded);
            displayElement.innerText = `+${formattedTime}`;
            applyColorEffects(displayElement, displayColor);
        }
    }

    applyTimerColor(timerColor);

    displayElement.style.display = "block";
    displayElement.style.opacity = "1";

    adjustmentInterval = setInterval(() => {
        if (skipAnimation) {
            currentState = newState;
            skipAnimation = false
        }
        const currentSeconds = currentSecondsRemaining();
        const newSeconds = currentSecondsRemaining(newState);
        if (currentSeconds > newSeconds) {
            currentState.seconds_remaining -= 1;
            timerElement.textContent = convertSecondsToHMS(currentSecondsRemaining());
        } else if (currentSeconds < newSeconds) {
            currentState.seconds_remaining += 1;
            timerElement.textContent = convertSecondsToHMS(currentSecondsRemaining());
        } else {
            currentState = newState
            clearInterval(adjustmentInterval);
            adjustmentInterval = null;

            resetTimerColor();

            displayElement.style.opacity = "0";
            setTimeout(() => {
                displayElement.style.display = "none";
                processingAddition = false;
                processStateQueue();
            }, 500);
        }
    }, 1);
}

ipcRenderer.on('skip-animation', (event) => {
    skipAnimation = true;
})

ipcRenderer.on('apply-theme', (event, themeCssPath) => {
    let style = document.getElementById("style").href = themeCssPath;
    console.log("theme applied");
});

setInterval(() => {
    if (processingAddition) return
    const remainingSeconds = currentSecondsRemaining()
    if (remainingSeconds === null) {
        timerElement.textContent = "N/A"
        return
    }
    if (remainingSeconds > 0) remainingSeconds === 0
    timerElement.textContent = convertSecondsToHMS(remainingSeconds);
}, 500)

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
