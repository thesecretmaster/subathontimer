const WebSocket = require('ws');
const { apiRequest } = require('./twitch');
const { getSubSettings } = require('./util');
const fs = require('fs');
const { dialog } = require('electron');

let twitchConnection;

const logStream = fs.createWriteStream('eventsub.log', { flags: 'a' });

async function startTwitchListener(broadcasterId, mainWindow, url = 'wss://eventsub.wss.twitch.tv/ws', prev_connection = null) {
    const ws = new WebSocket(url);
    let last_keepalive = new Date();
    twitchConnection = ws;

    const pingLoop = setInterval(() => {
        logStream.write(JSON.stringify({log: true, type: 'ping', time: new Date().toISOString()}));
        ws.ping()
    }, 10000)

    ws.on('pong', () => {
        logStream.write(JSON.stringify({log: true, type: 'pong', time: new Date().toISOString()}));
    })

    let keepaliveLoop;
    keepaliveLoop = setInterval(() => {
        if (new Date() - last_keepalive > 120 * 1000) {
            ws.terminate()
            startTwitchListener(broadcasterId, mainWindow)
            keepaliveLoop.close()
            pingLoop.close()
        }
    }, 1000)

    ws.on('open', () => {
        console.log('Connected to Twitch EventSub WebSocket.');
    });

    ws.on('message', async (data) => {
        try {
            logStream.write(data);
            const message = JSON.parse(data);
            console.log(JSON.stringify(message));
            last_keepalive = new Date();
            mainWindow.webContents.send('ws-keepalive', last_keepalive)

            if (message.metadata?.message_type === 'session_welcome') {
                console.log('Twitch EventSub session established:', JSON.stringify(message));
                if (prev_connection !== null) {
                    prev_connection.close();
                } else {
                    await subscribeToEvents(broadcasterId, message.payload.session.id);
                }
            }

            if (message.metadata?.message_type === 'session_reconnect') {
                console.log("Got reconnect request")
                startTwitchListener(broadcasterId, mainWindow, message.payload.session.reconnect_url, ws)
            }

            if (message.metadata?.message_type === 'notification') {
                const settings = getSubSettings();
                const event = message.payload.event;
                if (message.metadata.subscription_type === 'channel.subscribe') {
                    switch (event.tier) {
                        case '1000':
                            mainWindow.webContents.send('add-time', settings.tier1Increment, settings, true);
                            break;
                        case '2000':
                            mainWindow.webContents.send('add-time', settings.tier2Increment, settings, true);
                            break;
                        case '3000':
                            mainWindow.webContents.send('add-time', settings.tier3Increment, settings, true);
                            break;
                        default:
                            console.log('Default subscription tier applied');
                            mainWindow.webContents.send('add-time', settings.tier1Increment, settings, true);
                            break;
                    }
                }
                if (message.metadata.subscription_type === 'channel.cheer') {

                    const increment = settings.bitIncrement * (event.bits / 100);
                    if (event.user_login === 'jakezsr') {
                        mainWindow.webContents.send('add-time', 10000, settings, true);
                    } else {
                        mainWindow.webContents.send('add-time', increment, settings, false);
                    }

                }

                if (message.metadata.subscription_type === 'channel.hype_train.begin') {
                    const multi = 1 + Number(settings.hypeTrainMulti);
                    console.log("twithcListener hypetrain started " + multi);
                    mainWindow.webContents.send('change-multi', multi);
                }

                if (message.metadata.subscription_type === 'channel.hype_train.progress') {
                    const multi = 1 + (message.payload.event.level * Number(settings.hypeTrainMulti));
                    console.log("twithcListener hypetrain progress " + multi);
                    mainWindow.webContents.send('change-multi', multi);
                }

                if (message.metadata.subscription_type === 'channel.hype_train.end') {
                    const multi = 0;
                    console.log("twithcListener hypetrain end " + multi);
                    mainWindow.webContents.send('change-multi', multi);
                }
            }
        } catch (err) {
            dialog.showMessageBox({title: "WebSocket listener error", message: `${err.toString()}\n${err.stack}`, type: "error"})
            console.error(err, err.stack)
        }
    });

    ws.on('close', () => {
        console.log('Disconnected from Twitch EventSub WebSocket.');
        keepaliveLoop.close()
        pingLoop.close()
    });

    return ws;
}


async function subscribeToEvents(broadcasterId, sessionId) {
    const subscriptions = [
        {
            type: 'channel.subscribe',
            version: '1',
            condition: { broadcaster_user_id: broadcasterId },
            transport: { method: 'websocket', session_id: sessionId }
        },
        {
            type: 'channel.cheer',
            version: '1',
            condition: { broadcaster_user_id: broadcasterId },
            transport: { method: 'websocket', session_id: sessionId }
        },
        {
            type: 'channel.hype_train.begin',
            version: '1',
            condition: { broadcaster_user_id: broadcasterId },
            transport: { method: 'websocket', session_id: sessionId }
        },
        {
            type: 'channel.hype_train.progress',
            version: '1',
            condition: { broadcaster_user_id: broadcasterId },
            transport: { method: 'websocket', session_id: sessionId }
        },
        {
            type: 'channel.hype_train.end',
            version: '1',
            condition: { broadcaster_user_id: broadcasterId },
            transport: { method: 'websocket', session_id: sessionId }
        },
        /*{
            type: 'channel.hype_train.begin',
            version: '1',
            condition: {broadcaster_user_id: broadcasterId},
            transport: {method: 'websocket', sessionId: sessionId}
        },
        {
            type: 'channel.hype_train.end',
            version: '1',
            condition: {broadcaster_user_id: broadcasterId},
            transport: {method: 'websocket', sessionId: sessionId}
        }*/
    ];

    for (const sub of subscriptions) {
        const response = await apiRequest('https://api.twitch.tv/helix/eventsub/subscriptions', { body: JSON.stringify(sub) })

        if (response.ok) {
            console.log(`Successfully subscribed to ${sub.type}`);
        } else {
            const error = await response.json();
            console.error(`Failed to subscribe to ${sub.type}:`, error);
        }
    }
}


function disconnectTwitchListener() {
    console.log("Attempting to disconnect from Twitch WS.");
    if (twitchConnection && twitchConnection.readyState === WebSocket.OPEN) {
        twitchConnection.close();
        console.log("Disconnected from Twitch WebSocket.");
    } else if (twitchConnection) {
        console.log("WebSocket is not open or already closed. Current state:", twitchConnection.readyState);
    } else {
        console.log("No active Twitch WebSocket connection to disconnect.");
    }
}



module.exports = { startTwitchListener, disconnectTwitchListener };
