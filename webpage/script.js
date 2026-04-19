(() => {
  const socket = io();

  // ── DOM refs ──
  const $ = (id) => document.getElementById(id);
  const chatLog = $('chatLog');
  const commandBox = $('commandBox');
  const sendBtn = $('sendBtn');
  const connStatus = $('connectionStatus');
  const relayToggle = $('relayToggle');
  const rebootBtn = $('rebootBtn');
  const rebootModal = $('rebootModal');
  const rebootConfirm = $('rebootConfirm');
  const rebootCancel = $('rebootCancel');
  const broadcasterList = $('broadcasterList');
  const addBroadcasterInput = $('addBroadcasterInput');
  const addBroadcasterBtn = $('addBroadcasterBtn');

  // ── Helpers ──
  function esc(s) {
    return String(s)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  // ── Tab switching ──
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tabContent').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const target = $('tab-' + tab.dataset.tab);
      if (target) target.classList.add('active');

      // Load data when switching to a tab
      const tabName = tab.dataset.tab;
      if (tabName === 'poopcam') loadPoopCam();
      if (tabName === 'pissstreak') loadPissStreak();
      if (tabName === 'requests') loadRequests();
      if (tabName === 'dictionary') loadDictionary();
    });
  });

  // ── Connection status ──
  socket.on('connect', () => {
    connStatus.textContent = '● Connected';
    connStatus.className = 'tabBar-status connected';
    loadDashboardState();
  });
  socket.on('disconnect', () => {
    connStatus.textContent = '● Disconnected';
    connStatus.className = 'tabBar-status disconnected';
  });
  socket.on('connect_error', () => {
    connStatus.textContent = '● Connection Error';
    connStatus.className = 'tabBar-status disconnected';
  });

  // ── Chat ──
  function appendChat(text) {
    const line = Array.isArray(text) ? text.join('\n') : String(text ?? '');
    const normalized = line.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
    const row = document.createElement('div');
    row.className = 'chatLine';
    row.innerHTML = esc(normalized).replaceAll('\n', '<br>');
    chatLog.appendChild(row);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function appendChatMessage(displayName, color, text, emotes) {
    const row = document.createElement('div');
    row.className = 'chatLine';
    row.innerHTML =
      `<span class="chat-username" style="color:${esc(color)}">${esc(displayName)}:</span> ` +
      renderTextWithEmotes(text, emotes || []);
    chatLog.appendChild(row);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function renderTextWithEmotes(text, emotes) {
    if (!emotes.length) return esc(text);

    // Sort emotes by start position descending so we can splice without shifting indices.
    const sorted = [...emotes].sort((a, b) => a.start - b.start);
    let result = '';
    let lastIdx = 0;

    for (const em of sorted) {
      // Text before this emote
      result += esc(text.slice(lastIdx, em.start));
      // Emote image
      const emoteName = esc(text.slice(em.start, em.end + 1));
      result += `<img class="chat-emote" src="https://static-cdn.jtvnw.net/emoticons/v2/${esc(em.id)}/default/dark/2.0" alt="${emoteName}" title="${emoteName}">`;
      lastIdx = em.end + 1;
    }

    // Remaining text after last emote
    result += esc(text.slice(lastIdx));
    return result;
  }

  function sendCommand() {
    const text = commandBox.value.trim();
    if (!text) return;
    socket.emit('command', text);
    commandBox.value = '';
    commandBox.focus();
  }

  socket.on('message', (msg) => appendChat(msg));
  socket.on('chat_message', (data) => appendChatMessage(data.displayName, data.color, data.text, data.emotes));
  commandBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendCommand(); }
  });
  sendBtn.addEventListener('click', sendCommand);

  // ── Dashboard State ──
  function loadDashboardState() {
    socket.emit('get_state', (state) => {
      renderBroadcasters(state.broadcasters);
      relayToggle.checked = state.relayEnabled;
    });
  }

  // ── Broadcasters ──
  function renderBroadcasters(list) {
    broadcasterList.innerHTML = '';
    list.forEach((name) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="item-name">${esc(name)}</span>` +
        (name.toLowerCase() !== 'razstrats'
          ? `<button class="btn-remove" data-channel="${esc(name)}" title="Remove">×</button>`
          : '');
      broadcasterList.appendChild(li);
    });
    // Bind remove buttons
    broadcasterList.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const channel = btn.dataset.channel;
        socket.emit('remove_broadcaster', channel, (success) => {
          if (!success) appendChat(`[Dashboard] Could not remove ${channel}`);
        });
      });
    });
  }

  addBroadcasterBtn.addEventListener('click', () => {
    const channel = addBroadcasterInput.value.trim();
    if (!channel) return;
    addBroadcasterInput.value = '';
    socket.emit('add_broadcaster', channel, (success) => {
      if (!success) appendChat(`[Dashboard] Could not add ${channel}`);
    });
  });
  addBroadcasterInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addBroadcasterBtn.click(); }
  });

  socket.on('broadcasters_updated', (list) => renderBroadcasters(list));

  // ── Relay toggle ──
  relayToggle.addEventListener('change', () => {
    socket.emit('toggle_relay', relayToggle.checked);
  });
  socket.on('relay_updated', (enabled) => {
    relayToggle.checked = enabled;
  });

  // ── Reboot ──
  rebootBtn.addEventListener('click', () => rebootModal.classList.remove('hidden'));
  rebootCancel.addEventListener('click', () => rebootModal.classList.add('hidden'));
  rebootConfirm.addEventListener('click', () => {
    rebootModal.classList.add('hidden');
    socket.emit('reboot');
  });

  // ── Clip ──
  const clipBtn = $('clipBtn');
  clipBtn.addEventListener('click', () => {
    socket.emit('clip');
    clipBtn.textContent = '✓ Clipping...';
    setTimeout(() => { clipBtn.textContent = '📎 Take Clip'; }, 3000);
  });

  // ── PoopCam Tab ──
  function loadPoopCam() {
    socket.emit('get_poopcam', (data) => {
      $('poopTotalRequests').textContent = data.totalRequests.toLocaleString();
      $('poopRateLimit').textContent = data.rateLimit;
      const tbody = $('poopLeaderboard').querySelector('tbody');
      tbody.innerHTML = '';
      if (data.leaderboard.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="color:var(--text-muted);font-style:italic">No data yet</td></tr>';
        return;
      }
      data.leaderboard.forEach((entry) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${entry.rank}</td><td>${esc(entry.userName)}</td><td>${entry.requestCount}</td>`;
        tbody.appendChild(tr);
      });
    });
  }

  $('refreshPoopCam').addEventListener('click', loadPoopCam);
  $('setRateLimitBtn').addEventListener('click', () => {
    const val = parseInt($('rateLimitInput').value, 10);
    if (isNaN(val) || val < 0) return;
    socket.emit('set_rate_limit', val, (success) => {
      if (success) {
        $('poopRateLimit').textContent = val;
        $('rateLimitInput').value = '';
      }
    });
  });

  // ── Piss Streak Tab ──
  function loadPissStreak() {
    socket.emit('get_piss_streak', (data) => {
      $('pissCounter').textContent = data.daysSince;
    });
  }
  $('refreshPissStreak').addEventListener('click', loadPissStreak);

  // ── Feature Requests Tab ──
  function loadRequests() {
    socket.emit('get_requests', (data) => {
      const container = $('requestsList');
      container.innerHTML = '';
      if (data.requests.length === 0) {
        container.innerHTML = '<p class="empty-state">No feature requests.</p>';
        return;
      }
      data.requests.forEach((req) => {
        const div = document.createElement('div');
        div.className = 'request-item';
        div.innerHTML =
          `<div class="request-info">` +
            `<div class="request-text"><a href="${esc(req.url)}" target="_blank" rel="noopener">#${req.issueNumber}</a> ${esc(req.request)}</div>` +
            `<div class="request-meta">by ${esc(req.requester)} · ${esc(req.date)}</div>` +
          `</div>` +
          `<button class="btn-remove" data-issue="${req.issueNumber}" title="Close">×</button>`;
        container.appendChild(div);
      });
      container.querySelectorAll('.btn-remove').forEach((btn) => {
        btn.addEventListener('click', () => {
          const issueNumber = parseInt(btn.dataset.issue, 10);
          socket.emit('delete_request', issueNumber, (success) => {
            if (success) loadRequests();
          });
        });
      });
    });
  }
  $('refreshRequests').addEventListener('click', loadRequests);

  // ── Dictionary Tab ──
  function loadDictionary() {
    socket.emit('get_dictionary', (data) => {
      const container = $('dictionaryContent');
      container.innerHTML = '';
      if (data.words.length === 0) {
        container.innerHTML = '<p class="empty-state">No meme definitions yet.</p>';
        return;
      }
      data.words.forEach((word) => {
        const group = document.createElement('div');
        group.className = 'dict-word-group';
        group.innerHTML =
          `<div class="dict-word-header"><span>${esc(word)}</span><span class="arrow">▶</span></div>` +
          `<div class="dict-defs" data-word="${esc(word)}"></div>`;
        container.appendChild(group);

        const header = group.querySelector('.dict-word-header');
        const defsContainer = group.querySelector('.dict-defs');
        header.addEventListener('click', () => {
          const isOpen = header.classList.toggle('expanded');
          defsContainer.classList.toggle('visible', isOpen);
          if (isOpen && defsContainer.children.length === 0) {
            loadWordDefs(word, defsContainer);
          }
        });
      });
    });
  }

  function loadWordDefs(word, container) {
    socket.emit('get_word', word, (data) => {
      container.innerHTML = '';
      if (data.definitions.length === 0) {
        container.innerHTML = '<p class="empty-state">No definitions.</p>';
        return;
      }
      data.definitions.forEach((def, i) => {
        const div = document.createElement('div');
        div.className = 'dict-def-item';
        div.innerHTML =
          `<span>${esc(def)}</span>` +
          `<button class="btn-remove" data-word="${esc(word)}" data-index="${i}" title="Delete">×</button>`;
        container.appendChild(div);
      });
      container.querySelectorAll('.btn-remove').forEach((btn) => {
        btn.addEventListener('click', () => {
          const w = btn.dataset.word;
          const idx = parseInt(btn.dataset.index, 10);
          socket.emit('delete_definition', { word: w, index: idx }, (success) => {
            if (success) loadWordDefs(w, container);
          });
        });
      });
    });
  }

  $('refreshDictionary').addEventListener('click', loadDictionary);

  // ── User Definitions Toggle ──
  const userDefsToggle = $('userDefsToggle');
  socket.emit('get_user_definitions_enabled', (enabled) => {
    userDefsToggle.checked = enabled;
  });
  userDefsToggle.addEventListener('change', () => {
    socket.emit('set_user_definitions_enabled', userDefsToggle.checked);
  });
  socket.on('user_definitions_enabled_updated', (enabled) => {
    userDefsToggle.checked = enabled;
  });

  $('addDefBtn').addEventListener('click', () => {
    const word = $('dictWordInput').value.trim();
    const def = $('dictDefInput').value.trim();
    if (!word || !def) return;
    socket.emit('add_definition', { word, definition: def }, (success) => {
      if (success) {
        $('dictWordInput').value = '';
        $('dictDefInput').value = '';
        loadDictionary();
      }
    });
  });
})();
