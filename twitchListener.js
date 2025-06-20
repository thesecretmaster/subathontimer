const WebSocket = require('ws');

let twitchConnection;


async function startTwitchListener(clientId, oauthToken, broadcasterId, settings, mainWindow) {
    const ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');
    twitchConnection = ws;

    ws.on('open', () => {
        console.log('Connected to Twitch EventSub WebSocket.');
    });

    ws.on('message', async (data) => {
        const message = JSON.parse(data);
        console.log(JSON.stringify(message));
        if (message.metadata?.message_type === 'session_welcome') {
            console.log('Twitch EventSub session established:', JSON.stringify(message));
            await subscribeToEvents(clientId, oauthToken, broadcasterId, message.payload.session.id);
        }

        if (message.metadata?.message_type === 'notification') {
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
                const multi = 1.1;
                console.log("twithcListener hypetrain started " + multi);
                mainWindow.webContents.send('change-multi', multi);
            }

            if (message.metadata.subscription_type === 'channel.hype_train.progress') {
                const multi = 1 + (message.payload.event.level * 0.1);
                console.log("twithcListener hypetrain progress " + multi);
                mainWindow.webContents.send('change-multi', multi);
            }

            if (message.metadata.subscription_type === 'channel.hype_train.end') {
                const multi = 0;
                console.log("twithcListener hypetrain end " + multi);
                mainWindow.webContents.send('change-multi', multi);
            }
        }
    });

    ws.on('close', () => {
        console.log('Disconnected from Twitch EventSub WebSocket.');
    });

    return ws;
}


async function subscribeToEvents(clientId, oauthToken, broadcasterId, sessionId) {
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
        const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
            method: 'POST',
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${oauthToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sub)
        });

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
