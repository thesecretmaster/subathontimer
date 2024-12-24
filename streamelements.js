const io = require('socket.io-client');

/**
 * Connects to StreamElements realtime API and listens for events.
 * @param {string} jwt - The JWT token for the channel you want to listen to (Twitch or YouTube).
 * @param {function} onEvent - Callback triggered when a relevant subscription/membership event occurs.
 */
function startStreamElementsListener(jwt, onEvent) {
  const socket = io('https://realtime.streamelements.com', {
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Connected to StreamElements realtime service.');

    socket.emit('authenticate', { method: 'jwt', token: jwt });
  });

  socket.on('authenticated', (data) => {
    console.log('Successfully authenticated with StreamElements:', data);
  });

  socket.on('unauthorized', (error) => {
    console.error('Unauthorized:', error.message);
  });
  socket.on('event', (data) => {

    if (data.provider === 'twitch' && data.type === 'subscriber') {
      onEvent({
        type: 'twitch-sub',
        user: data.data.displayName || data.data.username,
        amount: data.data.amount
      });
    }

    if (data.provider === 'youtube' && data.type === 'subscriber') {
      onEvent({
        type: 'youtube-member',
        user: data.data.displayName || data.data.username,
        amount: data.data.amount
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected from StreamElements realtime service:', reason);
  });

  return socket;
}

module.exports = { startStreamElementsListener };
