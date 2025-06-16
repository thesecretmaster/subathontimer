const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

function writeJsonFile(filename, data) {
    const full_path = path.join(app.getPath('userData'), filename)
    fs.writeFileSync(full_path, JSON.stringify(data, null, 2));
}

function deleteJsonFile(filename) {
    const full_path = path.join(app.getPath('userData'), filename)
    fs.unlinkSync(full_path);
}

function readJsonFile(filename, fallback) {
    const full_path = path.join(app.getPath('userData'), filename)
    try {
        return JSON.parse(fs.readFileSync(full_path, 'utf8'));
    } catch (err) {
        if (fallback === undefined) {
            console.log(`Error reading json file \`${full_path}\`:`, err)
            throw err
        } else {
            console.log(`Error reading json file \`${full_path}\`. Falling back`)
            return fallback
        }
    }
}

function createLogStream(filename) {
    const stream = fs.createWriteStream(path.join(app.getPath('logs'), filename), { flags: 'a' });
    // Ensure the log file is properly closed on exit
    process.on('exit', () => stream.end());
    return stream
}

const SUB_SETTINGS_DEFAULT = {
  "startingTime": "100",
  "randomHourChance": ".01",
  "oddsForMultiplier": ".1",
  "amountForMultiplier": "4",
  "tier1Increment": "12",
  "tier2Increment": "360",
  "tier3Increment": "900",
  "bitIncrement": "30",
  "hypeTrainMulti": "0.1"
}

function getSubSettings() {
    return {
        ...SUB_SETTINGS_DEFAULT,
        ...readJsonFile('subSettings.json', {})
    };
}

module.exports = { readJsonFile, getSubSettings, writeJsonFile, createLogStream, deleteJsonFile };
