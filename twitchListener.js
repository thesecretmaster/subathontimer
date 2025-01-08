const WebSocket = require('ws');

/**
 * Starts a Twitch EventSub WebSocket listener for subscriptions and cheers.
 * @param {string} clientId - Twitch Application Client ID.
 * @param {string} oauthToken - OAuth token for authentication.
 * @param {string} broadcasterId - The User ID of the Twitch broadcaster to monitor.
 * @param {object} settings - Application settings.
 * @param {object} mainWindow - Reference to the Electron main window.
 */
async function startTwitchListener(clientId, oauthToken, broadcasterId, settings, mainWindow) {
    const ws = new WebSocket('wss://eventsub.wss.twitch.tv/ws');

    ws.on('open', () => {
        console.log('Connected to Twitch EventSub WebSocket.');
    });

    ws.on('message', async (data) => {
        const message = JSON.parse(data);
        console.log(message);
        if (message.metadata?.message_type === 'session_welcome') {
            console.log('Twitch EventSub session established:', message);
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
                console.log("cheer1");
                const increment = settings.bitIncrement * (event.bits / 100);
                mainWindow.webContents.send('add-time', increment, settings, false);
            }
        }
    });

    ws.on('close', () => {
        console.log('Disconnected from Twitch EventSub WebSocket.');
    });

    return ws;
}

/**
 * Subscribes to Twitch EventSub events.
 * @param {string} clientId - Twitch Application Client ID.
 * @param {string} oauthToken - OAuth token for authentication.
 * @param {string} broadcasterId - The User ID of the broadcaster.
 * @param {string} sessionId - WebSocket session ID.
 */
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
        }
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

module.exports = { startTwitchListener };
