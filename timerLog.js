const { BrowserWindow } = require("electron");
const { createFileStream, SingletonWindow } = require("./util")
const path = require('path');
const { timer } = require("./timerUtils");

const logsWindow = new SingletonWindow((mainWindow) => {
    const win = new BrowserWindow({
        width: 800,
        height: 300,
        parent: mainWindow,
        autoHideMenuBar: true,
        resizable: false,
        icon: __dirname + 'img/icon.ico',
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'preloads/preload-logs.js')
        }
    });
    win.loadFile('logs.html');
    return win
})


const timerLogStream = createFileStream('logs.json', false)
function timerLogWrite(json) {
    timerLogStream.write(JSON.stringify(json) + "\n")
    logsWindow.use((win) => win.webContents.send('add-log', json))
}

process.on('exit', () => {
    timerLogWrite({logType: 'process', event: 'exit', timestamp: new Date(), timerTime: timer.currentTimeMs()})
    timerLogStream.end()
});

timerLogWrite({logType: 'process', event: 'start', timestamp: new Date(), timerTime: timer.currentTimeMs()});

module.exports = { timerLogWrite, logsWindow }
