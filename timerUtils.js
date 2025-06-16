const { writeJsonFile, getSubSettings, readJsonFile, deleteJsonFile } = require("./util");
const EventEmitter = require('node:events');

const STATEFILE_NAME = 'timerState.json'

class TimerState extends EventEmitter {
    #last_updated;
    #seconds_remaining;
    #running;

    constructor(start_seconds, running = false, last_updated = null) {
        super()
        this.#seconds_remaining = start_seconds
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

    pause() {
        if (this.#running) {
            this.#running = false
            this.#setTime(this.#currentTime())
        }
    }

    setStartTime(start_time) {
        if (this.#last_updated === null) {
            this.#seconds_remaining = start_time
            this.#changeState();
        }
    }

    #currentTime() {
        let v;
        if (this.#last_updated === null) {
            v = this.#seconds_remaining
        } else {
            v = this.#seconds_remaining - Math.round((new Date() - this.#last_updated) / 1000)
        }
        return v >= 0 ? v : 0;
    }

    #setTime(newTime, metadata = null) {
        this.#seconds_remaining = newTime
        if (this.#last_updated !== null) this.#last_updated = new Date()
        this.#changeState(metadata);
    }

    getState() {
        return {
            last_updated: this.#last_updated,
            seconds_remaining: this.#seconds_remaining,
            running: this.#running
        }
    }

    reset() {
        deleteJsonFile(STATEFILE_NAME);
        this.#running = false
        this.#last_updated = null
        this.#seconds_remaining = Number(getSubSettings().startingTime);
        this.#changeState();
    }

    #changeState(metadata = null) {
        const state = this.getState()
        this.emit('update', state, metadata)
        writeJsonFile(STATEFILE_NAME, state);
    }

    modify(f, metadata = null) {
        this.#setTime(f(this.#currentTime()), metadata)

        return this.#seconds_remaining
    }

    addSeconds(secondsToAdd, metadata = null) {
        return this.modify((seconds) => seconds + secondsToAdd, metadata)
    }

    setSeconds(newSeconds, metadata = null) {
        return this.modify((seconds) => newSeconds, metadata)
    }
}

const timerState = readJsonFile(STATEFILE_NAME, null)
let timer;
if (timerState === null) {
    timer = new TimerState(Number(getSubSettings().startingTime))
} else {
    timer = new TimerState(timerState["seconds_remaining"], timerState["running"], new Date(timerState["last_updated"]))
}

module.exports = { timer }
