const { timer } = require("./timerUtils");
const { getSubSettings } = require("./util");

class SubathonState {
    #hypeTrainLevel = 0
    #hypeTrainTimeout = null;

    setHypeTrainLevel(lvl) {
        this.#hypeTrainLevel = lvl
        console.log("Updating hype train level to:", lvl)
        if (this.#hypeTrainTimeout !== null) {
            this.#hypeTrainTimeout.close()
        }
        if (lvl !== 0) {
            this.#hypeTrainTimeout = setTimeout(() => {
                console.log("Hype train hasn't been updated in 10 minutes. Resetting.")
                this.#hypeTrainLevel = 0
            }, 60 * 10 * 1000 /* 10 minutes */)
        }
    }

    // tier is from the twitch API: https://dev.twitch.tv/docs/eventsub/eventsub-reference/#channel-subscribe-event
    addSub(tier) {
        const settings = getSubSettings()
        let multiplier = 1 + this.#hypeTrainLevel * Number(settings.hypeTrainMulti)
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

        timer.addSeconds(secondsToAdd, {type: 'sub', randomHour, randomMulti, secondsAdded: secondsToAdd, tier})
    }

    addBits(bits) {
        const settings = getSubSettings()
        const secondsToAdd = Number(settings.bitIncrement) * (bits / 100);
        timer.addSeconds(secondsToAdd, {type: 'bits', secondsAdded: secondsToAdd, bits})
    }
}

const subathon_state = new SubathonState()

module.exports = { subathon_state }
