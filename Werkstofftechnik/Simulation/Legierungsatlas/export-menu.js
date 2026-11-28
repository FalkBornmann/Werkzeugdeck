// Image exports for the phase atlas. Generation and downloads stay on the device.
(() => {
  function mount({ anchor, items, defaultItem }) {
    const panel = document.createElement('section');
    panel.className = 'wd-export-menu';
    panel.setAttribute('aria-label', 'Grafik speichern');
    panel.innerHTML = '<h3>Darstellung speichern</h3><div class="wd-export-fields">' +
      '<label>Darstellung<select data-export-object></select></label>' +
      '<label>Dateityp<select data-export-format><option value="png">PNG · Bild</option>' +
      '<option value="svg">SVG · Vektorgrafik</option></select></label>' +
      '<button data-export-save>Speichern</button></div>' +
      '<p>PNG und SVG zeigen dieselben Daten und Beschriftungen. Die Datei wird lokal erzeugt.</p>' +
      '<p data-export-message role="status" aria-live="polite"></p>';
    anchor.append(panel);
    const selection = panel.querySelector('[data-export-object]');
    const type = panel.querySelector('[data-export-format]');
    const save = panel.querySelector('[data-export-save]');
    const message = panel.querySelector('[data-export-message]');
    for (const item of items) selection.add(new Option(item.label, item.id));
    selection.value = defaultItem || items[0].id;
    const current = () => items.find(item => item.id === selection.value);
    let saving = false;
    function refresh() {
      if (saving) return;
      for (const option of selection.options) {
        option.disabled = items.find(item => item.id === option.value).enabled?.() === false;
      }
      if (selection.selectedOptions[0]?.disabled) {
        const available = [...selection.options].find(option => !option.disabled);
        if (available) selection.value = available.value;
      }
      save.disabled = current().enabled?.() === false;
    }
    selection.addEventListener('change', refresh);
    save.addEventListener('click', async () => {
      refresh();
      if (save.disabled || saving) return;
      saving = true;
      save.disabled = true;
      selection.disabled = true;
      type.disabled = true;
      message.textContent = 'Grafik wird erzeugt …';
      try {
        await current().save(type.value);
        message.textContent = 'Grafik gespeichert.';
      } catch (error) {
        message.textContent = 'Speichern fehlgeschlagen: ' + error.message;
      } finally {
        saving = false;
        selection.disabled = false;
        type.disabled = false;
        refresh();
      }
    });
    const observer = new MutationObserver(refresh);
    observer.observe(document.querySelector('main'), {
      subtree: true, attributes: true, attributeFilter: ['hidden'],
    });
    refresh();
    return { panel, refresh };
  }
  globalThis.WDExports = { mount };
})();
