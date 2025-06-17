const WebSocket = require('ws');
const EventEmitter = require('node:events');
const { apiRequest } = require('./twitch');
const { createLogStream } = require('./util');
const { dialog } = require('electron');
const { subathon_state } = require('./subathonState');
const { timerLogWrite } = require('./timerLog');

let connection_good = true;
const logStream = createLogStream('eventsub.log');
const EVENTSUB_SOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws'
const EVENTSUB_SUBSCRIBE_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions'

// const EVENTSUB_SOCKET_URL = 'ws://127.0.0.1:8080/ws'
// const EVENTSUB_SUBSCRIBE_URL = 'http://127.0.0.1:8080/eventsub/subscriptions'

class TwitchListener extends EventEmitter {
    #disconnected = false;
    #last_autoreconnect = new Date();
    #broadcasterId;
    #twitchConnection;

    constructor(broadcasterId, url = EVENTSUB_SOCKET_URL, prev_connection = null) {
        super();
        this.#broadcasterId = broadcasterId
        this.#start(url, prev_connection)
    }

    #start(url = EVENTSUB_SOCKET_URL, prev_connection = null) {
        const ws = new WebSocket(url);
        let last_keepalive = null;
        this.#twitchConnection = ws;

        const pingLoop = setInterval(() => {
            logStream.write(JSON.stringify({log: true, type: 'ping', time: new Date().toISOString()}));
            ws.ping()
        }, 10000)

        ws.on('pong', () => {
            logStream.write(JSON.stringify({log: true, type: 'pong', time: new Date().toISOString()}));
        })

        let keepaliveLoop;
        keepaliveLoop = setInterval(() => {
            if (new Date() - last_keepalive > 30 * 1000) {
                if (connection_good) {
                    timerLogWrite({logType: 'connection', state: 'bad', timestamp: new Date()});
                    connection_good = false;
                }
            } else {
                if (!connection_good) {
                    timerLogWrite({logType: 'connection', state: 'good', timestamp: new Date()});
                    connection_good = true;
                }
            }
            if (new Date() - last_keepalive > 120 * 1000) {
                ws.terminate()
                this.#disconnected = true;
                this.#start()
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

                if (message.metadata?.message_type === 'session_welcome') {
                    console.log('Twitch EventSub session established:', JSON.stringify(message));
                    if (prev_connection !== null) {
                        prev_connection.close();
                    } else {
                        if (await this.#subscribeToEvents(message.payload.session.id)) {
                            this.emit('ws-setup-complete')
                        }
                    }
                }

                last_keepalive = new Date();
                this.emit('ws-keepalive', last_keepalive)

                if (message.metadata?.message_type === 'session_reconnect') {
                    console.log("Got reconnect request")
                    this.#disconnected = true;
                    this.#start(message.payload.session.reconnect_url, ws)
                }

                if (message.metadata?.message_type === 'notification') {
                    const event = message.payload.event;
                    if (message.metadata.subscription_type === 'channel.subscribe') {
                        subathon_state.addSub(event.tier, event)
                    }
                    if (message.metadata.subscription_type === 'channel.cheer') {
                        subathon_state.addBits(event.bits, event)
                    }

                    if (message.metadata.subscription_type === 'channel.hype_train.begin') {
                        subathon_state.setHypeTrainLevel(1)
                    }

                    if (message.metadata.subscription_type === 'channel.hype_train.progress') {
                        subathon_state.setHypeTrainLevel(message.payload.event.level)
                    }

                    if (message.metadata.subscription_type === 'channel.hype_train.end') {
                        subathon_state.setHypeTrainLevel(0)
                    }
                }
            } catch (err) {
                dialog.showMessageBox({title: "WebSocket listener error", message: `${err.toString()}\n${err.stack}`, type: "error"})
                console.error(err, err.stack)
            }
        });

        ws.on('close', (code, data) => {
            console.log('Disconnected from Twitch EventSub WebSocket.', code, data.toString());
            keepaliveLoop.close()
            pingLoop.close()
            if (!this.#disconnected) {
                const wait_seconds = Math.max(60 - ((new Date() - this.#last_autoreconnect) / 1000), 0)
                console.log(`Disconnect was not triggered intentionally. Restarting in ${wait_seconds} seconds}`)
                if (wait_seconds > 0) {
                    setTimeout(() => {
                        this.#last_autoreconnect = new Date()
                        this.#start()
                    }, min_reconnect_wait * 1000)
                } else {
                    this.#last_autoreconnect = new Date()
                    this.#start()
                }
            }
        });

        return ws;
    }


    async #subscribeToEvents(sessionId) {
        const subscriptions = [
            {
                type: 'channel.subscribe',
                version: '1',
                condition: { broadcaster_user_id: this.#broadcasterId },
                transport: { method: 'websocket', session_id: sessionId }
            },
            {
                type: 'channel.cheer',
                version: '1',
                condition: { broadcaster_user_id: this.#broadcasterId },
                transport: { method: 'websocket', session_id: sessionId }
            },
            {
                type: 'channel.hype_train.begin',
                version: '1',
                condition: { broadcaster_user_id: this.#broadcasterId },
                transport: { method: 'websocket', session_id: sessionId }
            },
            {
                type: 'channel.hype_train.progress',
                version: '1',
                condition: { broadcaster_user_id: this.#broadcasterId },
                transport: { method: 'websocket', session_id: sessionId }
            },
            {
                type: 'channel.hype_train.end',
                version: '1',
                condition: { broadcaster_user_id: this.#broadcasterId },
                transport: { method: 'websocket', session_id: sessionId }
            },
            /*{
                type: 'channel.hype_train.begin',
                version: '1',
                condition: {broadcaster_user_id: this.#broadcasterId},
                transport: {method: 'websocket', sessionId: sessionId}
            },
            {
                type: 'channel.hype_train.end',
                version: '1',
                condition: {broadcaster_user_id: this.#broadcasterId},
                transport: {method: 'websocket', sessionId: sessionId}
            }*/
        ];

        let any_errors = false;
        for (const sub of subscriptions) {
            const response = await apiRequest(EVENTSUB_SUBSCRIBE_URL, { body: JSON.stringify(sub) })

            if (response.ok) {
                console.log(`Successfully subscribed to ${sub.type}`);
            } else {
                any_errors = true;
                const error = await response.json();
                console.error(`Failed to subscribe to ${sub.type}:`, error);
            }
        }
        return !any_errors
    }

    disconnect() {
        console.log("Attempting to disconnect from Twitch WS.");
        if (this.#twitchConnection && this.#twitchConnection.readyState === WebSocket.OPEN) {
            this.#disconnected = true;
            this.#twitchConnection.close();
            console.log("Disconnected from Twitch WebSocket.");
        } else if (this.#twitchConnection) {
            console.log("WebSocket is not open or already closed. Current state:", this.#twitchConnection.readyState);
        } else {
            console.log("No active Twitch WebSocket connection to disconnect.");
        }
    }
}

module.exports = { TwitchListener };
