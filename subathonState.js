const { EventEmitter } = require("node:events");
const { timer } = require("./timerUtils");
const { getSubSettings } = require("./util");

class SubathonState extends EventEmitter {
    #hypeTrainLevel = 0
    #multiOverride = null
    #hypeTrainTimeout = null;

    setHypeTrainLevel(lvl) {
        this.#hypeTrainLevel = lvl
        this.#emitMulti()
        console.log("Updating hype train level to:", lvl)
        if (this.#hypeTrainTimeout !== null) {
            this.#hypeTrainTimeout.close()
        }
        if (lvl !== 0) {
            this.#hypeTrainTimeout = setTimeout(() => {
                console.log("Hype train hasn't been updated in 10 minutes. Resetting.")
                this.#hypeTrainLevel = 0
                this.#emitMulti()
            }, 60 * 10 * 1000 /* 10 minutes */)
        }
    }

    getMultiplier() {
        return {multiplier: this.#base_multiplier(), hype_train: this.#hypeTrainMulti(), override: this.#multiOverride}
    }

    #emitMulti() {
        this.emit('change-multiplier', this.getMultiplier())
    }

    overrideMulti(v) {
        this.#multiOverride = v
        this.#emitMulti()
    }

    clearOverrideMulti() {
        this.#multiOverride = null
        this.#emitMulti()
    }

    #hypeTrainMulti() {
        const settings = getSubSettings()
        return 1 + this.#hypeTrainLevel * Number(settings.hypeTrainMulti)
    }

    #base_multiplier() {
        if (this.#multiOverride === null) {
            return this.#hypeTrainMulti()
        } else {
            return this.#multiOverride
        }
    }

    // tier is from the twitch API: https://dev.twitch.tv/docs/eventsub/eventsub-reference/#channel-subscribe-event
    addSub(tier, event) {
        const settings = getSubSettings()
        let multiplier = this.#base_multiplier()
        let secondsToAdd;
        switch (tier) {
            case '1000':
                secondsToAdd = Number(settings.tier1Increment);
                break;
            case '2000':
                secondsToAdd = Number(settings.tier2Increment);
                break;
            case '3000':
                secondsToAdd = Number(settings.tier3Increment);
                break;
            default:
                console.log('Default subscription tier applied');
                secondsToAdd = Number(settings.tier1Increment);
                break;
        }

        const randomMulti = Math.random() <= Number(settings.oddsForMultiplier);
        if (randomMulti) {
            multiplier += Number(settings.amountForMultiplier);
        }

        // Hour addition
        const randomHour = Math.random() <= Number(settings.randomHourChance);
        if (randomHour) {
            secondsToAdd = 3600;
        }

        secondsToAdd = Math.trunc(secondsToAdd * multiplier);

        timer.addSeconds(secondsToAdd, {type: 'sub', randomHour, randomMulti, multiplier, secondsAdded: secondsToAdd, event})
    }

    addBits(bits, event) {
        const settings = getSubSettings()
        const multiplier = this.#base_multiplier()
        const secondsToAdd = Number(settings.bitIncrement) * (bits / 100) * multiplier;
        timer.addSeconds(secondsToAdd, {type: 'bits', secondsAdded: secondsToAdd, multiplier, event})
    }
}

const subathon_state = new SubathonState()

module.exports = { subathon_state }
