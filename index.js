const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
let mainWindow;
let configWindow;
let subathonConfigWindow;
let subathonControlsWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    modal: true,
    webPreferences: {
      nodeIntegration: true, 
      contextIsolation: false
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

function createSubathonControlsWindow() {
    if(subathonControlsWindow) {
        subathonControlsWindow.focus();
        return;
    }

    subathonControlsWindow = new BrowserWindow({
        width: 400,
        height: 300,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false
          }
    });
    subathonControlsWindow.loadFile('subathoncontrols.html');

    subathonControlsWindow.on('closed', () => {
        subathonControlsWindow = null
    });
}

function createSubathonConfigWindow() {
    if(subathonConfigWindow) {
        subathonConfigWindow.focus();
        return;
    }

    subathonConfigWindow = new BrowserWindow({
        width: 400,
        height: 300,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false
          }
    });
    subathonConfigWindow.loadFile('subathonsettings.html');

    subathonConfigWindow.on('closed', () => {
        subathonConfigWindow = null
    });
}

function createConfigWindow() {
  if (configWindow) {
    configWindow.focus();
    return;
  }

  configWindow = new BrowserWindow({
    width: 400,
    height: 300,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: false
    }
  });

  configWindow.loadFile('config.html');

  configWindow.on('closed', () => {
    configWindow = null;
  });
}

// Handle incoming credentials from the config window
ipcMain.on('save-keys', (event, { twitchClientId, youtubeApiKey }) => {
  fs.writeFileSync('apiConfig.json', JSON.stringify({ twitchClientId, youtubeApiKey }, null, 2));
  console.log('Received credentials:', { twitchClientId, youtubeApiKey });

  if (configWindow) {
    configWindow.close();
  }
});

// Handle request to get saved keys
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

const config = JSON.parse(fs.readFileSync('apiConfig.json', 'utf8'));
const twitchJWT = config.twitchClientId;   
const youtubeJWT = config.youtubeApiKey;   

// Start a listener for Twitch subscriptions
const twitchSocket = startStreamElementsListener(twitchJWT, (event) => {
  if (event.type === 'twitch-sub') {
    console.log('New Twitch subscriber:', event.user, 'Tier:', event.tier);
  }
});

// Start a listener for YouTube memberships
const youtubeSocket = startStreamElementsListener(youtubeJWT, (event) => {
  if (event.type === 'youtube-member') {
    console.log('New YouTube member:', event.user);
  }
});
