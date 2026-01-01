(() => {
  /** @type {import('socket.io-client').Socket | any} */
  const socket = io();

  const mainBox = /** @type {HTMLDivElement | null} */ (
    document.getElementById('mainBox')
  );
  const commandBox = /** @type {HTMLInputElement | null} */ (
    document.getElementById('commandBox')
  );
  const sendBtn = /** @type {HTMLButtonElement | null} */ (
    document.getElementById('sendBtn')
  );

  if (!mainBox || !commandBox) {
    return;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function appendToMainBox(text) {
    const line = Array.isArray(text) ? text.join('\n') : String(text ?? '');
    const normalized = line.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    const row = document.createElement('div');
    row.className = 'chatLine';
    row.innerHTML = escapeHtml(normalized).replaceAll('\n', '<br>');
    mainBox.appendChild(row);
    mainBox.scrollTop = mainBox.scrollHeight;
  }

  function sendCommand() {
    const text = commandBox.value.trim();
    if (!text) return;

    socket.emit('command', text);
    commandBox.value = '';
    commandBox.focus();
  }

  commandBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendCommand();
    }
  });

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      sendCommand();
    });
  }

  socket.on('message', (msg) => {
    appendToMainBox(msg);
  });

  socket.on('connect_error', (err) => {
    appendToMainBox(`[socket error] ${err?.message ?? err}`);
  });
})();
