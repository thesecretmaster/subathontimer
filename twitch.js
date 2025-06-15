const fs = require('node:fs');
const { readJsonFile, writeJsonFile } = require('./util');
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

async function apiRequest(url, options) {
    const tokenConfig = readJsonFile('apiToken.json');
    const appConfig = readJsonFile('apiConfig.json');
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Client-ID': appConfig.twitchClientId,
        'Authorization': `Bearer ${tokenConfig['access_token']}`
    }
    if (!options.method) options.method = 'POST'
    const res = await fetch(url, options)
    if (res.status === 401) {
        const refresh_res = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({client_id: appConfig.twitchClientId, client_secret: appConfig.twitchClientSecret, grant_type: 'refresh_token', refresh_token: tokenConfig['refresh_token']})
        });
        if (refresh_res.ok) {
            const refresh_json = await refresh_res.json();
            writeJsonFile('apiToken.json', refresh_json);
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${refresh_json['access_token']}`
            }
            return await fetch(url, options)
        } else {
            return res
        }
    } else {
        return res
    }
}

module.exports = { getOAuthToken, apiRequest };
