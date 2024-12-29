const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
let mainWindow;
let configWindow;
let subathonConfigWindow;
let subathonControlsWindow;

const config = JSON.parse(fs.readFileSync('apiConfig.json', 'utf8'));
const settings = JSON.parse(fs.readFileSync('subSettings.json', 'utf8'));

///
/// Main Window
///
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 200,
    resizable: false,
    autoHideMenuBar: true,
    modal: true,
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
  mainWindow.webContents.send('add-time', amount);
});

ipcMain.on('remove-time', (event, amount) => {
  mainWindow.webContents.send('add-time', amount);
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
ipcMain.on('save-sub-settings', (event, { startingTime, tier1Increment, tier2Increment, tier3Increment, bitIncrement, memberIncrement, superchatIncrement }) => {
  fs.writeFileSync('subSettings.json', JSON.stringify({ startingTime, tier1Increment, tier2Increment, tier3Increment, bitIncrement, memberIncrement, superchatIncrement }, null, 2));
  console.log('Received credentials:', { startingTime, tier1Increment, tier2Increment, tier3Increment, bitIncrement, memberIncrement, superchatIncrement });
  console.log(startingTime);
  mainWindow.webContents.send('set-start-time', startingTime);
  if (configWindow) {
    configWindow.close();
  }
});

// Get and Restore settings
ipcMain.handle('get-sub-settings', async () => {
  let config = { startingTime: '', tier1Increment: '', tier2Increment: '', tier3Increment: '', bitIncrement: '', memberIncrement: '', superchatIncrement: '' };
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
    console.log('New Twitch subscriber:', event.user, 'Tier:', event.tier);
    switch(event.tier)
    {
      case 1:
        mainWindow.webContents.send('add-time', settings.tier1Increment);
      case 2:
        mainWindow.webContents.send('add-time', settings.tier2Increment);
      case 3:
        mainWindow.webContents.send('add-time', settings.tier3Increment);
    }
  }
});

// Start a listener for YouTube memberships
const youtubeSocket = startStreamElementsListener(youtubeJWT, (event) => {
  if (event.type === 'youtube-member') {
    console.log('New YouTube member:', event.user);
    mainWindow.webContents.send('add-time', settings.memberIncrement);
  }
});
