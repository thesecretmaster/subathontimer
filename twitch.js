/**
 * Fetches an OAuth token using the Client Credentials Flow.
 * @param {string} clientId - Your Twitch app's Client ID.
 * @param {string} clientSecret - Your Twitch app's Client Secret.
 * @returns {Promise<string>} - The OAuth token.
 */
async function getOAuthToken(clientId, clientSecret) {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
}

module.exports = { getOAuthToken };
