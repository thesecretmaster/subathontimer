//grabs auth from client info
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
