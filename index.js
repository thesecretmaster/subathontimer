const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
let mainWindow;
let configWindow;
let subathonConfigWindow;
let subathonControlsWindow;
let themeWindow;
let themeCreatorWindow;

const config = JSON.parse(fs.readFileSync('apiConfig.json', 'utf8'));
const settings = JSON.parse(fs.readFileSync('subSettings.json', 'utf8'));

///
/// Main Window
///
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 150,
    resizable: false,
    autoHideMenuBar: true,
    modal: true,
    icon: __dirname + 'img/icon.ico',
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false,
      preload: path.join(__dirname, 'preloads/preload-timer.js'),
    },
  });

  mainWindow.loadFile('timer.html');

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
    if(subathonControlsWindow) {
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
  mainWindow.webContents.send('start-timer');
});

ipcMain.handle('pause-timer', async () => {
  mainWindow.webContents.send('pause-timer');
});

ipcMain.on('start-multi', (event, value) => {
    mainWindow.webContents.send('change-multi', value);
});

ipcMain.on('add-time', (event, amount) => {
  mainWindow.webContents.send('add-time', amount, null);
});

ipcMain.on('remove-time', (event, amount) => {
  mainWindow.webContents.send('add-time', amount, null);
});

///
/// Subathon Settings Window
///

function createSubathonConfigWindow() {
    if(subathonConfigWindow) {
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
ipcMain.on('save-sub-settings', (event, { startingTime, randomHourChance, oddsForMultiplier, amountForMultiplier, tier1Increment, tier2Increment, tier3Increment, bitIncrement, memberIncrement, superchatIncrement }) => {
  fs.writeFileSync('subSettings.json', JSON.stringify({ startingTime, randomHourChance, oddsForMultiplier, amountForMultiplier, tier1Increment, tier2Increment, tier3Increment, bitIncrement, memberIncrement, superchatIncrement }, null, 2));
  console.log('Received credentials:', { startingTime, randomHourChance, oddsForMultiplier, amountForMultiplier, tier1Increment, tier2Increment, tier3Increment, bitIncrement, memberIncrement, superchatIncrement });
  console.log(startingTime);
  mainWindow.webContents.send('set-start-time', startingTime);
  if (configWindow) {
    configWindow.close();
  }
});

// Get and Restore settings
ipcMain.handle('get-sub-settings', async () => {
  let config = { startingTime: '', randomHourChance: '', oddsForMultiplier: '', amountForMultiplier: '', tier1Increment: '', tier2Increment: '', tier3Increment: '', bitIncrement: '', memberIncrement: '', superchatIncrement: '' };
  try {
    if (fs.existsSync('subSettings.json')) {
      const data = fs.readFileSync('subSettings.json', 'utf-8');
      config = JSON.parse(data);
      mainWindow.webContents.send('set-start-time', settings.startingTime);
    }
  } catch (err) {
    console.error('Error reading subSettings.json:', err);
  }
  return config;
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

  configWindow.loadFile('config.html');

  configWindow.on('closed', () => {
    configWindow = null;
  });
}

// Take keys from API key window and save them
ipcMain.on('save-keys', (event, { twitchClientId, youtubeApiKey }) => {
  fs.writeFileSync('apiConfig.json', JSON.stringify({ twitchClientId, youtubeApiKey }, null, 2));
  console.log('Received credentials:', { twitchClientId, youtubeApiKey });

  if (configWindow) {
    configWindow.close();
  }
});

// Get and Restore API Keys
ipcMain.handle('get-api-keys', async () => {
  let config = { twitchClientId: '', youtubeApiKey: '' };
  try {
    if (fs.existsSync('apiConfig.json')) {
      const data = fs.readFileSync('apiConfig.json', 'utf-8');
      config = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading apiConfig.json:', err);
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
