const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { apiRequest } = require('./twitch');
const { readJsonFile, getSubSettings, writeJsonFile, createLogStream } = require('./util');
const { timer } = require('./timerUtils');
const { TwitchListener } = require('./twitchListener');
let mainWindow;
let configWindow;
let subathonConfigWindow;
let subathonControlsWindow;
let themeWindow;
let themeCreatorWindow;
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
            nodeIntegration: true,
            contextIsolation: false,
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
                    createConfigWindow();
                },
            },
            {
                label: 'Subathon Settings',
                click: () => {
                    createSubathonConfigWindow();
                },
            },
            {
                label: 'Controls',
                click: () => {
                    createSubathonControlsWindow();
                },
            },
            {
                label: 'Theme Selector',
                click: () => {
                    createThemeWindow();
                },
            },
            {
                label: 'Theme Creator',
                click: () => {
                    createthemeCreatorWindow();
                },
            },
        ]);
        menu.popup({ window: mainWindow });
    });
}

///
/// Subathon Controls Window
///

function createSubathonControlsWindow() {
    if (subathonControlsWindow) {
        subathonControlsWindow.focus();
        return;
    }

    subathonControlsWindow = new BrowserWindow({
        width: 800,
        height: 300,
        parent: mainWindow,
        autoHideMenuBar: true,
        resizable: false,
        icon: __dirname + 'img/icon.ico',
        modal: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            preload: path.join(__dirname, 'preloads/preload-subcontrols.js')
        }
    });
    subathonControlsWindow.loadFile('subathoncontrols.html');

    subathonControlsWindow.on('closed', () => {
        subathonControlsWindow = null
    });
}

ipcMain.handle('start-timer', async () => {
    timer.resume()
});

ipcMain.handle('pause-timer', async () => {
    timer.pause()
});

ipcMain.handle('skip-animation', async () => {
    mainWindow.webContents.send('skip-animation')
});

ipcMain.on('add-time', (event, amount) => {
    timer.addSeconds(Number(amount))
});

ipcMain.on('remove-time', (event, amount) => {
    timer.addSeconds(-Number(amount))
});

ipcMain.handle('clear-stored-time', (event) => {
    timer.reset()
})

let oauthServerRunning = false
const twitchRedirectUri = 'http://localhost:8008/oauth'

ipcMain.on('save-api-config', (event, data) => {
    writeJsonFile('apiConfig.json', data);
    if (!oauthServerRunning) {
        const http = require('node:http');

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

      server.listen(8008);
      oauthServerRunning = true
    }

    require('electron').shell.openExternal(`https://id.twitch.tv/oauth2/authorize?client_id=${data.twitchClientId}&redirect_uri=${twitchRedirectUri}&response_type=code&scope=bits:read channel:read:subscriptions channel:read:hype_train`);
});

///
/// Subathon Settings Window
///

function createSubathonConfigWindow() {
    if (subathonConfigWindow) {
        subathonConfigWindow.focus();
        return;
    }

    subathonConfigWindow = new BrowserWindow({
        width: 450,
        height: 700,
        parent: mainWindow,
        resizable: false,
        autoHideMenuBar: true,
        icon: __dirname + 'img/icon.ico',
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'preloads/preload-subsettings.js'),
            nodeIntegration: false,
            contextIsolation: false
        }
    });
    subathonConfigWindow.loadFile('subathonsettings.html');

    subathonConfigWindow.on('closed', () => {
        subathonConfigWindow = null
    });
}

// Take settings from settings window and save them
ipcMain.on('save-sub-settings', (event, settings) => {
    writeJsonFile('subSettings.json', settings);
    console.log('Received credentials:', settings);
    if (settings.startingTime) {
        timer.setStartTime(settings.startingTime)
    }
    if (configWindow) {
        configWindow.close();
    }
});

// Get and Restore settings
ipcMain.handle('get-sub-settings', async () => {
    return getSubSettings();
});

///
/// API Key Window
///

function createConfigWindow() {
    if (configWindow) {
        configWindow.focus();
        return;
    }

    configWindow = new BrowserWindow({
        width: 350,
        height: 500,
        autoHideMenuBar: true,
        resizable: false,
        parent: mainWindow,
        modal: true,
        icon: __dirname + 'img/icon.ico',
        webPreferences: {
            preload: path.join(__dirname, 'preloads/preload-apiconfig.js'),
            nodeIntegration: false,
            contextIsolation: false
        }
    });

    configWindow.loadFile('apiConfig.html');

    configWindow.on('closed', () => {
        configWindow = null;
    });
}

// Get and Restore API Keys
ipcMain.handle('get-api-keys', async () => {
    const config = readJsonFile('apiConfig.json', {});
    if (config.twitchClientId && config.youtubeApiKey && config.clientId) {
        disconnectTwitchWS();
        attemptTwitchConnect();
    }
    return config;
});

///
/// Theme Selector
///

function createThemeWindow() {
    if (themeWindow) {
        themeWindow.focus();
        return;
    }

    themeWindow = new BrowserWindow({
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

    themeWindow.loadFile('themeselector.html');

    themeWindow.on('closed', () => {
        themeWindow = null;
    });
}

ipcMain.on('apply-theme', (event, themeCssPath) => {
    mainWindow.webContents.send('apply-theme', themeCssPath);
});

///
/// Theme Creator
///

function createthemeCreatorWindow() {
    if (themeCreatorWindow) {
        themeCreatorWindow.focus();
        return;
    }

    themeCreatorWindow = new BrowserWindow({
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

    themeCreatorWindow.loadFile('themecreator.html');

    themeCreatorWindow.on('closed', () => {
        themeCreatorWindow = null;
    });
}


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
