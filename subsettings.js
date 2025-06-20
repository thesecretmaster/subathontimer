document.addEventListener('DOMContentLoaded', async () => {
  const settings = await window.electronAPI.getSettings();
  const form = document.getElementById('subathonForm');
  for (const e of form.elements) {
    let v = settings[e.name]
    if (v) {
      if (e.classList.contains('hhmmss')) v = toHhMmSs(v)
      e.value = v
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form)
    for (const e of form.elements) {
      if (e.classList.contains('hhmmss')) formData.set(e.name, parseHhMmSs(e.value))
    }
    window.electronAPI.saveSettings(Object.fromEntries(formData.entries()));
  });
});
