document.addEventListener('DOMContentLoaded', async () => {
  // Retrieve saved keys
  const config = await electronAPI.getApiConfig();
  document.getElementById('twitchUsername').value = config.twitchUsername || '';
  document.getElementById('twitchClientId').value = config.twitchClientId || '';
  document.getElementById('twitchClientSecret').value = config.twitchClientSecret || '';

  const form = document.getElementById('apiForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const keys = {
      twitchUsername: document.getElementById('twitchUsername').value,
      twitchClientId: document.getElementById('twitchClientId').value,
      twitchClientSecret: document.getElementById('twitchClientSecret').value
    };
    electronAPI.saveApiConfig(keys);
  })
});
