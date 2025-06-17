const { writeJsonFile, getSubSettings, readJsonFile, deleteJsonFile } = require("./util");
const EventEmitter = require('node:events');

const STATEFILE_NAME = 'timerState.json'

class TimerState extends EventEmitter {
    #last_updated;
    #ms_remaining;
    #running;

    constructor(start_ms, running = false, last_updated = null) {
        super()
        this.#ms_remaining = start_ms
        this.#running = running

        if (this.#running && last_updated === null) {
            // Can't start both running and paused
            this.#last_updated = new Date()
        } else {
            this.#last_updated = last_updated
        }
    }

    resume() {
        if (!this.#running) {
            this.#running = true
            this.#last_updated = new Date()
            this.#changeState();
        }
    }

    pause(metadata = null) {
        if (this.#running) {
            this.#setTime(this.#currentTime())
            this.#running = false
            this.#changeState(metadata);
        }
    }

    setStartTimeSeconds(start_seconds) {
        if (this.#last_updated === null) {
            this.#ms_remaining = start_seconds * 1000
            this.#changeState();
        }
    }

    #currentTime() {
        let v;
        if (this.#last_updated === null || !this.#running) {
            v = this.#ms_remaining
        } else {
            v = this.#ms_remaining - (new Date() - this.#last_updated)
        }
        return v >= 0 ? v : 0;
    }

    #setTime(newTime) {
        this.#ms_remaining = Math.max(newTime, 0)
        if (this.#last_updated !== null) this.#last_updated = new Date()
    }

    getState() {
        return {
            last_updated: this.#last_updated,
            ms_remaining: this.#ms_remaining,
            running: this.#running
        }
    }

    reset() {
        deleteJsonFile(STATEFILE_NAME);
        this.#running = false
        this.#last_updated = null
        this.#ms_remaining = Number(getSubSettings().startingTime) * 1000;
        this.#changeState();
    }

    #changeState(metadata = null) {
        const state = this.getState()
        this.emit('update', state, metadata)
        writeJsonFile(STATEFILE_NAME, state);
    }

    modify(f, metadata = null) {
        this.#setTime(f(this.#currentTime()))
        this.#changeState(metadata);

        return this.#ms_remaining
    }

    addSeconds(secondsToAdd, metadata = null) {
        return this.modify((ms) => ms + secondsToAdd * 1000, metadata)
    }

    setSeconds(newSeconds, metadata = null) {
        return this.modify((ms) => newSeconds * 1000, metadata)
    }
}

const timerState = readJsonFile(STATEFILE_NAME, null)
let timer;
if (timerState === null) {
    timer = new TimerState(Number(getSubSettings().startingTime))
} else {
    timer = new TimerState(timerState["seconds_remaining"] ? timerState["seconds_remaining"] * 1000 : timerState["ms_remaining"], timerState["running"], new Date(timerState["last_updated"]))
}

module.exports = { timer }
