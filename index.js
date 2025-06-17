const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { apiRequest } = require('./twitch');
const { readJsonFile, getSubSettings, writeJsonFile, createLogStream, createFileStream, readFile, SingletonWindow } = require('./util');
const { timer } = require('./timerUtils');
const { TwitchListener } = require('./twitchListener');
const { timerLogWrite, logsWindow } = require('./timerLog');
const { subathon_state } = require('./subathonState');
let mainWindow;
let twitchConnection = null;

const logStream = createLogStream('log.txt');

const originalLog = console.log;
console.log = function(...args) {
    logStream.write(`[LOG] ${new Date().toISOString()} - ${args.join(' ')}\n`);
    originalLog.apply(console, args);
};

const originalError = console.error;
console.error = function(...args) {
    logStream.write(`[ERROR] ${new Date().toISOString()} - ${args.join(' ')}\n`);
    originalError.apply(console, args);
};

// Override other console methods as needed
const originalWarn = console.warn;
console.warn = function(...args) {
    logStream.write(`[WARN] ${new Date().toISOString()} - ${args.join(' ')}\n`);
    originalWarn.apply(console, args);
};

const originalInfo = console.info;
console.info = function(...args) {
    logStream.write(`[INFO] ${new Date().toISOString()} - ${args.join(' ')}\n`);
    originalInfo.apply(console, args);
};

///
/// Main Window
///
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 150,
        resizable: false,
        autoHideMenuBar: true,
        alwaysOnTop: true,
        modal: true,
        icon: __dirname + 'img/icon.ico',
        webPreferences: {
            preload: path.join(__dirname, 'preloads/preload-timer.js'),
        },
    });

    mainWindow.loadFile('timer.html');
    mainWindow.once('ready-to-show', () => {
        mainWindow.webContents.send('update-timer', timer.getState())
    })

    timer.on('update', (state, metadata) => {
        mainWindow.webContents.send('update-timer', state, metadata)
    })

    mainWindow.webContents.on('context-menu', (e, params) => {
        const menu = Menu.buildFromTemplate([
            {
                label: 'Configure API Keys',
                click: () => {
                    configWindow.create();
                },
            },
            {
                label: 'Subathon Settings',
                click: () => {
                    subathonConfigWindow.create();
                },
            },
            {
                label: 'Controls',
                click: () => {
                    subathonControlsWindow.create();
                },
            },
            {
                label: 'Logs',
                click: () => {
                    logsWindow.create(mainWindow);
                },
            },
            {
                label: 'Theme Selector',
                click: () => {
                    themeWindow.create();
                },
            },
            {
                label: 'Theme Creator',
                click: () => {
                    themeCreatorWindow.create();
                },
            },
        ]);
        menu.popup({ window: mainWindow });
    });
}

///
/// Subathon Controls Window
///

const subathonControlsWindow = new SingletonWindow(() => {
    const win = new BrowserWindow({
        width: 800,
        height: 300,
        parent: mainWindow,
        autoHideMenuBar: true,
        resizable: false,
        icon: __dirname + 'img/icon.ico',
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'preloads/preload-subcontrols.js')
        }
    });
    win.once('ready-to-show', () => {
        win.webContents.send('change-multiplier', subathon_state.getMultiplier())
    })
    win.loadFile('subathoncontrols.html');
    return win
})

subathon_state.on('change-multiplier', (v) => {
    subathonControlsWindow.use((win) => win.webContents.send('change-multiplier', v))
})

ipcMain.on('start-multi', (event, multi) => {
    subathon_state.overrideMulti(multi)
})

ipcMain.on('clear-multi', () => {
    subathon_state.clearOverrideMulti()
})

ipcMain.handle('start-timer', () => {
    timer.resume()
});

ipcMain.handle('pause-timer', () => {
    timer.pause()
});

ipcMain.handle('skip-animation', () => {
    mainWindow.webContents.send('skip-animation')
});

ipcMain.on('add-time', (event, amount) => {
    timer.addSeconds(Number(amount), {type: 'manual', secondsAdded: Number(amount)})
});

ipcMain.on('remove-time', (event, amount) => {
    timer.addSeconds(-Number(amount), {type: 'manual', secondsAdded: Number(amount)})
});

ipcMain.handle('clear-stored-time', () => {
    timer.reset()
})

let oauthServerRunning = false
const twitchRedirectUri = 'http://localhost:8008/oauth'

ipcMain.on('save-api-config', (event, data) => {
    writeJsonFile('apiConfig.json', data);
    if (!oauthServerRunning) {
        const http = require('node:http');

        console.log("Creating Twitch OAuth HTTP server")
        const server = http.createServer(async (req, res) => {
            const params = new URLSearchParams(req.url.split('?', 2)[1])
            const token_res = await fetch('https://id.twitch.tv/oauth2/token', {method: 'POST', headers: { "Content-Type": "application/x-www-form-urlencoded", }, body: new URLSearchParams({client_id: data.twitchClientId, client_secret: data.twitchClientSecret, code: params.get('code'), grant_type: 'authorization_code', redirect_uri: twitchRedirectUri})})
            if (token_res.ok) {
                writeJsonFile('apiToken.json', await token_res.json());
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Token setup complete! You may now close this window');
                server.close()
                oauthServerRunning = false
                configWindow.close();
                disconnectTwitchWS();
                attemptTwitchConnect();
            } else {
                res.writeHead(token_res.status);
                res.end(await token_res.bytes());
            }
        });
        server.on('close', () => {
            console.log("Twitch OAuth HTTP server closing")
        })

      server.listen(8008);
      oauthServerRunning = true
    }

    require('electron').shell.openExternal(`https://id.twitch.tv/oauth2/authorize?client_id=${data.twitchClientId}&redirect_uri=${twitchRedirectUri}&response_type=code&scope=bits:read channel:read:subscriptions channel:read:hype_train`);
});

///
/// Subathon Settings Window
///

const subathonConfigWindow = new SingletonWindow(() => {
    const win = new BrowserWindow({
        width: 450,
        height: 700,
        parent: mainWindow,
        resizable: false,
        autoHideMenuBar: true,
        icon: __dirname + 'img/icon.ico',
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'preloads/preload-subsettings.js'),
        }
    });
    win.loadFile('subathonsettings.html');
    return win;
})

// Take settings from settings window and save them
ipcMain.on('save-sub-settings', (event, settings) => {
    writeJsonFile('subSettings.json', settings);
    console.log('Received credentials:', settings);
    if (settings.startingTime) {
        timer.setStartTimeSeconds(settings.startingTime)
    }
    configWindow.close();
});

// Get and Restore settings
ipcMain.handle('get-sub-settings', async () => {
    return getSubSettings();
});

///
/// API Key Window
///

const configWindow = new SingletonWindow(() => {
    const win = new BrowserWindow({
        width: 350,
        height: 500,
        autoHideMenuBar: true,
        resizable: false,
        parent: mainWindow,
        modal: true,
        icon: __dirname + 'img/icon.ico',
        webPreferences: {
            preload: path.join(__dirname, 'preloads/preload-apiconfig.js'),
        }
    });
    win.loadFile('apiConfig.html');
    return win;
})

// Get and Restore API Keys
ipcMain.handle('get-api-config', () => {
    const config = readJsonFile('apiConfig.json', {});
    if (config.twitchClientId && config.youtubeApiKey && config.clientId) {
        disconnectTwitchWS();
        attemptTwitchConnect();
    }
    return config;
});

timer.on('update', (state, metadata) => {
    const log = {logType: 'timerState', logData: {state, metadata}}
    timerLogWrite(log)
})

ipcMain.handle('get-logs', () => {
    const logs = readFile('logs.json', '').split('\n').filter(line => line !== '')
    return logs.map(i => JSON.parse(i))
});

///
/// Theme Selector
///

const themeWindow = new SingletonWindow(() => {
    const win = new BrowserWindow({
        width: 350,
        height: 700,
        autoHideMenuBar: true,
        resizable: false,
        parent: mainWindow,
        modal: true,
        icon: __dirname + 'img/icon.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    win.loadFile('themeselector.html');
    return win;
})

ipcMain.on('apply-theme', (event, themeCssPath) => {
    mainWindow.webContents.send('apply-theme', themeCssPath);
});

///
/// Theme Creator
///

const themeCreatorWindow = new SingletonWindow(() => {
    const win = new BrowserWindow({
        width: 350,
        height: 700,
        autoHideMenuBar: true,
        resizable: false,
        parent: mainWindow,
        modal: true,
        icon: __dirname + 'img/icon.ico',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    win.loadFile('themecreator.html');
    return win;
})

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
function attemptTwitchConnect() {
    const { twitchUsername } = readJsonFile('apiConfig.json');

    console.log("Attempting connect to Twitch API");

    (async () => {
        // Fetch broadcaster ID
        const userResponse = await apiRequest(`https://api.twitch.tv/helix/users?login=${twitchUsername}`, { method: 'GET' });
        const userData = await userResponse.json();
        console.log(userData);
        const broadcasterId = userData.data[0].id;

        // Start the Twitch listener
        if (twitchConnection !== null) twitchConnection.disconnect()
        twitchConnection = new TwitchListener(broadcasterId);
        twitchConnection.on('ws-keepalive', (ts) => mainWindow.webContents.send('ws-keepalive', ts))
        twitchConnection.on('ws-setup-complete', () => mainWindow.webContents.send('ws-setup-complete'))
    })();
}

function disconnectTwitchWS() {
    console.log("Attempting to disconnect from Twitch WS.");
    if (twitchConnection !== null) twitchConnection.disconnect()
}

attemptTwitchConnect();

/*
//STREAMELEMENTS
const { startStreamElementsListener } = require('./streamelements');
const twitchJWT = config.twitchClientId;   
const youtubeJWT = config.youtubeApiKey;   

// Start a listener for Twitch subscriptions
const twitchSocket = startStreamElementsListener(twitchJWT, (event) => {
  if (event.type === 'twitch-sub') {
    switch(event.tier)
    {
      case "1000":
        mainWindow.webContents.send('add-time', settings.tier1Increment, settings);
        break;
      case "2000":
        mainWindow.webContents.send('add-time', settings.tier2Increment, settings);
        break;
      case "3000":
        mainWindow.webContents.send('add-time', settings.tier3Increment, settings);
        break;
      default: //streamlabs is weird and sometimes a tier isnt applied to the event. apply tier 1 increment as other tiers are always defined.
      console.log("default");
        mainWindow.webContents.send('add-time', settings.tier1Increment, settings);
        break;
    }
  }

  if (event.type === 'twitch-cheer') {
    mainWindow.webContents.send('add-time', settings.bitIncrement * (event.amount / 100), settings);
  }
});

// Start a listener for YouTube memberships
const youtubeSocket = startStreamElementsListener(youtubeJWT, (event) => {
  if (event.type === 'youtube-member') {
    console.log('New YouTube member:', event.user);
    mainWindow.webContents.send('add-time', settings.memberIncrement * event.amount, settings);
  }

  if (event.type === 'youtube-superchat') {
    mainWindow.webContents.send('add-time', settings.superchatIncrement * event.amount, settings);
  }
});
*/
