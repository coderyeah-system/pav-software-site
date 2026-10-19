/* PAV AI Concierge chat widget */
(function() {
  const WEBHOOK_URL = 'https://cloud.activepieces.com/api/v1/webhooks/6fqQauWsmV8902ncbqA6G/sync';
  const STORAGE_KEY = 'pav_chat_v1';
  const PAGE = (document.body.dataset.page || location.pathname.split('/').pop() || 'index.html');

  let history = [];
  let lead = { name: '', email: '', company: '', interest: '' };
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); history = saved.history || []; if (saved.lead) lead = { ...lead, ...saved.lead }; } catch (e) {}
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ history: history.slice(-30), lead })); } catch (e) {} }

  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function scroll() { const m = document.getElementById('pav-msg-area'); if (m) m.scrollTop = m.scrollHeight; }

  function addMessage(role, text) {
    const m = document.getElementById('pav-msg-area'); if (!m) return;
    const div = el('div', 'pav-msg ' + (role === 'user' ? 'pav-msg-user' : role === 'system' ? 'pav-msg-system' : 'pav-msg-bot'));
    div.textContent = text;
    m.appendChild(div); scroll();
    if (role === 'user' || role === 'bot') {
      history.push({ role: role === 'user' ? 'user' : 'assistant', content: text });
      persist();
    }
  }

  function showTyping() {
    const m = document.getElementById('pav-msg-area'); if (!m) return null;
    const t = el('div', 'pav-typing'); t.id = 'pav-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    m.appendChild(t); scroll();
    return t;
  }
  function hideTyping() { const t = document.getElementById('pav-typing'); if (t) t.remove(); }

  async function callAI(message) {
    const payload = { source: 'chat', message, history: history.slice(0, -1).map(h => h.role + ': ' + h.content).join('\n'), contact: lead, interest: lead.interest, page: PAGE };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      return (data && data.reply) || 'Sorry, I had trouble responding. Please try again or email Kidx117@gmail.com.';
    } catch (err) {
      clearTimeout(timer);
      return 'Sorry, the AI concierge is taking a moment. Please try again, or reach us directly at Kidx117@gmail.com.';
    }
  }

  async function send(text) {
    const clean = (text || '').trim();
    if (!clean) return;
    addMessage('user', clean);
    const input = document.getElementById('pav-input'); if (input) input.value = '';
    const btn = document.getElementById('pav-send'); if (btn) btn.disabled = true;
    showTyping();
    const reply = await callAI(clean);
    hideTyping();
    addMessage('bot', reply);
    if (btn) btn.disabled = false;
    maybeOfferLeadCapture(reply);
  }

  function maybeOfferLeadCapture(reply) {
    const r = (reply || '').toLowerCase();
    const wants = (r.includes('email') && (r.includes('team') || r.includes('follow') || r.includes('reach') || r.includes('contact'))) || r.includes('quote') || r.includes('proposal') || r.includes('get in touch');
    const captured = !!(lead.name && lead.email);
    const panel = document.getElementById('pav-lead');
    if (wants && !captured && panel && !panel.classList.contains('active')) {
      panel.classList.add('active');
      setTimeout(() => { const n = document.getElementById('pav-lead-name'); if (n) n.focus(); }, 300);
    }
  }

  function submitLead(e) {
    if (e) e.preventDefault();
    const n = document.getElementById('pav-lead-name'); const em = document.getElementById('pav-lead-email');
    const co = document.getElementById('pav-lead-company');
    if (!n || !em) return;
    const name = n.value.trim(); const email = em.value.trim(); const company = co ? co.value.trim() : '';
    if (!name || !email) { addMessage('system', 'Please add at least your name and email so the team can follow up.'); return; }
    lead.name = name; lead.email = email; lead.company = company; persist();
    const panel = document.getElementById('pav-lead'); if (panel) panel.classList.remove('active');
    addMessage('system', 'Got it. The PAV team will follow up at ' + email + ' shortly.');
    setTimeout(() => send('Please have the team follow up with me at ' + email + (company ? ' (' + company + ')' : '') + ' about what we just discussed.'), 400);
  }

  function mount() {
    if (document.getElementById('pav-chat-root')) return;
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'assets/chat.css'; document.head.appendChild(css);

    const launcher = el('button', 'pav-chat-launcher');
    launcher.setAttribute('aria-label', 'Open chat with PAV AI');
    launcher.innerHTML = '💬<span class="pav-badge">AI</span>';
    launcher.onclick = toggle;

    const panel = el('div', 'pav-chat-panel'); panel.id = 'pav-chat-panel';
    panel.innerHTML = `
      <div class="pav-chat-header">
        <div class="pav-chat-header-avatar">🤖</div>
        <div class="pav-chat-header-info"><h3>PAV AI Concierge</h3><p>Online · replies in seconds</p></div>
        <button class="pav-chat-close" aria-label="Close">×</button>
      </div>
      <div class="pav-chat-messages" id="pav-msg-area"></div>
      <div class="pav-quick" id="pav-quick">
        <button data-q="I want to become a reseller with PAV Software.">Become a reseller</button>
        <button data-q="I'd like a quote for network security.">Request a quote</button>
        <button data-q="What products do you distribute?">What do you sell?</button>
        <button data-q="How do I contact the PAV team?">Contact info</button>
      </div>
      <div class="pav-chat-input">
        <textarea id="pav-input" placeholder="Type your message…" rows="1"></textarea>
        <button class="send" id="pav-send" aria-label="Send">➤</button>
      </div>
      <div class="pav-chat-lead" id="pav-lead">
        <p>Want the team to follow up? Drop your details.</p>
        <input id="pav-lead-name" type="text" placeholder="Your name" />
        <input id="pav-lead-email" type="email" placeholder="Email" />
        <input id="pav-lead-company" type="text" placeholder="Company (optional)" />
        <button id="pav-lead-send">Send to team</button>
      </div>
    `;

    document.body.appendChild(panel);
    document.body.appendChild(launcher);

    panel.querySelector('.pav-chat-close').onclick = toggle;
    const input = panel.querySelector('#pav-input');
    const sendBtn = panel.querySelector('#pav-send');
    sendBtn.onclick = () => send(input.value);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 100) + 'px'; });
    panel.querySelectorAll('.pav-quick button').forEach(b => { b.onclick = () => send(b.dataset.q); });
    panel.querySelector('#pav-lead-send').onclick = submitLead;

    if (history.length === 0) {
      addMessage('bot', 'Hi! I am the PAV AI Concierge. I can help with product questions, reseller applications, or quote requests. What can I help you with today?');
    } else {
      history.forEach(h => addMessage(h.role === 'user' ? 'user' : 'bot', h.content));
    }
  }

  let open = false;
  function toggle() {
    open = !open;
    const p = document.getElementById('pav-chat-panel');
    if (p) p.classList.toggle('pav-open', open);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
