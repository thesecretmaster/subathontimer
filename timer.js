let timerElement;
let adjustmentInterval = null;
let processingAddition = false; // To track if an addition is being processed
let last_keepalive = null;
let skipAnimation = false;
let wsSetupComplete = false;

function updateKeepaliveIndicator() {
    const warnElement = document.getElementById('keepaliveWarn')
    const setupElement = document.getElementById('setupIncomplete');
    warnElement.classList.remove(...warnElement.classList)
    if (last_keepalive === null) {
        warnElement.classList.add('warn-loading')
        warnElement.innerHTML = '🛑 Connection set-up incomplete or failed'
        setupElement.style.display = 'none'
    } else if (new Date() - last_keepalive > 30 * 1000) {
        warnElement.classList.add('warn-active')
        warnElement.textContent = '⚠️'
        setupElement.style.display = 'none'
    } else if (!wsSetupComplete) {
        setupElement.style.display = 'block'
    }
}

document.addEventListener('DOMContentLoaded', () => {
    timerElement = document.getElementById("subTimer");
    createAdditionDisplayElement();
    updateKeepaliveIndicator();
    setInterval(updateKeepaliveIndicator, 1000)
});

electronAPI.onWsSetupComplete(() => {
    wsSetupComplete = true;
    updateKeepaliveIndicator()
})

electronAPI.onWsKeepalive((keepalive_ts) => {
    last_keepalive = keepalive_ts
    updateKeepaliveIndicator()
})

const stateQueue = [];
let currentState = null;

electronAPI.onUpdateTimer((newState, metadata) => {
    stateQueue.push([newState, metadata])
    processStateQueue()
})

function currentSecondsRemaining(state = null) {
    return Math.round(currentMsRemaining(state) / 1000)
}

function currentMsRemaining(state = null) {
    if (state === null) state = currentState;
    let v;
    if (state === null) {
        return null
    } else if (state.last_updated === null) {
        v = state.ms_remaining
    } else if (state.running) {
        v = state.ms_remaining - (new Date() - state.last_updated)
    } else {
        v = state.ms_remaining
    }
    return v >= 0 ? v : 0
}

function updateTimerValue(v) {
    timerElement.textContent = ""
    if (v === undefined) v = convertSecondsToHMS(currentSecondsRemaining());
    const const_width_hacks = window.getComputedStyle(document.body).getPropertyValue('--timer-constant-width-hack') == 'true';
    if (const_width_hacks) {
        while (timerElement.children.length != v.length) {
            if (timerElement.children.length > v.length) {
                timerElement.removeChild(timerElement.firstChild)
            } else {
                const letter = document.createElement('span')
                timerElement.appendChild(letter)
            }
        }
        for (const [idx, letter] of [...v].entries()) {
            const e = timerElement.children[idx]
            if (letter.match(/\d/)) {
                e.textContent = '0'
                const width = e.offsetWidth
                e.style.width = width
                e.classList.add('number')
            }
            e.textContent = letter
        }
    } else {
        timerElement.textContent = v
    }
}

function processStateQueue() {
    if (processingAddition || stateQueue.length === 0) return;

    let [newState, metadata] = stateQueue.shift();
    console.log("Processing state queue element", newState, metadata)
    processingAddition = true;
    if (newState.last_updated === null) skipAnimation = true

    if (currentState === null) {
        currentState = newState
        updateTimerValue()
        processingAddition = false;
        console.log("Done processing inital state update")
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
            displayElement.textContent = `+${formattedTime}`;
            applyColorEffects(displayElement, displayColor);
        }
    }

    applyTimerColor(timerColor);

    displayElement.style.display = "block";
    displayElement.style.opacity = "1";

    adjustmentInterval = setInterval(() => {
        if (skipAnimation) {
            while (stateQueue.length > 0) {
                [newState, metadata] = stateQueue.shift();
            }
            console.log("Skipping animation, jumping to", newState);
            currentState = newState;
            updateTimerValue()
            skipAnimation = false
        }
        const currentMs = currentMsRemaining();
        const newMs = currentMsRemaining(newState);
        const diff = Math.max(Math.min(1000, newMs - currentMs), -1000);
        currentState.ms_remaining += diff
        updateTimerValue()
        if (Math.abs(diff) < 1000) {
            currentState = newState
            clearInterval(adjustmentInterval);
            adjustmentInterval = null;

            resetTimerColor();

            displayElement.style.opacity = "0";
            setTimeout(() => {
                displayElement.style.display = "none";
                displayElement.textContent = ""
                processingAddition = false;
                skipAnimation = false
                console.log("Done processing state update")
                processStateQueue();
            }, 500);
        }
    }, 1);
}

electronAPI.onSkipAnimation(() => {
    if (processingAddition) {
        skipAnimation = true;
    }
})

electronAPI.onApplyTheme((themeCssPath) => {
    document.getElementById("style").href = themeCssPath;
    console.log("theme applied");
});

setInterval(() => {
    if (processingAddition) return
    const remainingSeconds = currentSecondsRemaining()
    if (remainingSeconds === null) {
        updateTimerValue("N/A")
        return
    }
    if (remainingSeconds > 0) remainingSeconds === 0
    updateTimerValue()
}, 100)

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
