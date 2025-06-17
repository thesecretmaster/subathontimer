const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

class SingletonWindow {
    #win = null;
    #create_window;

    constructor(createWindow) {
        this.#create_window = createWindow;
    }

    close() {
        if (this.#win !== null) {
            this.#win.close();
        }
    }

    create(...args) {
        if (this.#win !== null) {
            this.#win.focus()
        } else {
            this.#win = this.#create_window(...args);
            this.#win.on('closed', () => {
                this.#win = null
            });
        }
    }

    use(f) {
        if (this.#win) f(this.#win)
    }
}


function writeJsonFile(filename, data) {
    const full_path = path.join(app.getPath('userData'), filename)
    fs.writeFileSync(full_path, JSON.stringify(data, null, 2));
}

function deleteJsonFile(filename) {
    const full_path = path.join(app.getPath('userData'), filename)
    fs.unlinkSync(full_path);
}

function readFile(filename, fallback) {
    const full_path = path.join(app.getPath('userData'), filename)
    try {
        return fs.readFileSync(full_path, 'utf8')
    } catch (err) {
        if (fallback === undefined) {
            console.log(`Error reading file \`${full_path}\`:`, err)
            throw err
        } else {
            console.log(`Error reading file \`${full_path}\`. Falling back`)
            return fallback
        }
    }
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

function createStream(path, handle_close = true) {
    const stream = fs.createWriteStream(path, { flags: 'a' });
    // Ensure the log file is properly closed on exit
    if (handle_close) process.on('exit', () => stream.end());
    return stream
}

function createLogStream(filename) {
    return createStream(path.join(app.getPath('logs'), filename))
}

function createFileStream(filename, handle_close = true) {
    return createStream(path.join(app.getPath('userData'), filename), handle_close)
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

module.exports = { readJsonFile, getSubSettings, writeJsonFile, createLogStream, deleteJsonFile, createFileStream, readFile, SingletonWindow };
