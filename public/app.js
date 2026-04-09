// ─── STITCH LIBRARY ──────────────────────────────────────────────────────────
function renderStitches(list) {
  const sg = document.getElementById('sg');
  sg.innerHTML = '';
  list.forEach(function(s) {
    const div = document.createElement('div');
    div.className = 'sc';
    div.onclick = function() { openModal(STITCHES.indexOf(s)); };
    div.innerHTML =
      '<img class="sc-img" src="images/' + s.key + '" alt="' + s.n + '" loading="lazy">' +
      '<div class="sc-body">' +
        '<div class="sn">' + s.n + '</div>' +
        '<span class="stag ' + s.tc + '">' + s.t + '</span>' +
        '<div class="sdesc">' + s.d.substring(0, 85) + '...</div>' +
      '</div>';
    sg.appendChild(div);
  });
}
renderStitches(STITCHES);

function openModal(i) {
  const s = STITCHES[i];
  document.getElementById('modal-img').src = 'images/' + s.key;
  document.getElementById('modal-img').alt = s.n;
  document.getElementById('modal-name').textContent = s.n;
  document.getElementById('modal-tag').innerHTML = '<span class="stag ' + s.tc + '" style="margin-bottom:10px;display:inline-block">' + s.t + '</span>';
  document.getElementById('modal-desc').textContent = s.d;
  document.getElementById('modal-steps').innerHTML = '<ol>' + s.s.map(function(st) { return '<li>' + st + '</li>'; }).join('') + '</ol>';
  document.getElementById('modal-ask-btn').onclick = function() {
    document.getElementById('modal').classList.remove('open');
    sw('chat');
    document.getElementById('ci').value = 'Can you tell me more about the ' + s.n + ' and when I would use it?';
    document.getElementById('ci').focus();
  };
  document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
  if (e.target === document.getElementById('modal')) {
    document.getElementById('modal').classList.remove('open');
  }
}

function fs() {
  const q = document.getElementById('sb2').value.toLowerCase();
  renderStitches(q ? STITCHES.filter(function(s) {
    return s.n.toLowerCase().includes(q) || s.t.toLowerCase().includes(q) || s.d.toLowerCase().includes(q);
  }) : STITCHES);
}

// ─── TAB SWITCHING ────────────────────────────────────────────────────────────
function sw(tab) {
  var tabs = ['chat', 'lib'];
  document.querySelectorAll('.tab').forEach(function(t, i) {
    t.classList.toggle('active', tabs[i] === tab);
  });
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('p-' + tab).classList.add('active');
}

// ─── FILE HANDLING ────────────────────────────────────────────────────────────
var pendingImage = null;
var pendingPdf = null;

function hf(inp) {
  var f = inp.files[0]; if (!f) return;
  pendingPdf = f;
  addChip('📄 ' + f.name, 'pdf');
  inp.value = '';
}
function hi(inp) {
  var f = inp.files[0]; if (!f) return;
  pendingImage = f;
  addChip('📷 ' + f.name, 'img');
  inp.value = '';
}
function addChip(label, type) {
  document.getElementById('prevs').innerHTML = '';
  var d = document.createElement('div');
  d.className = 'chip';
  d.innerHTML = label + ' <button onclick="remChip(\'' + type + '\')">×</button>';
  document.getElementById('prevs').appendChild(d);
}
function remChip(type) {
  if (type === 'pdf') pendingPdf = null;
  else pendingImage = null;
  document.getElementById('prevs').innerHTML = '';
}
function hk(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }
function ar(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 100) + 'px'; }

// ─── CHAT ─────────────────────────────────────────────────────────────────────
var history = [];

async function send() {
  var inp = document.getElementById('ci');
  var txt = inp.value.trim();
  if (!txt && !pendingImage && !pendingPdf) return;

  document.getElementById('sb').disabled = true;

  // Show user message
  var dispParts = [];
  if (txt) dispParts.push('<span>' + txt + '</span>');
  if (pendingImage) dispParts.push('<em style="font-size:11px;opacity:.7">📷 ' + pendingImage.name + '</em>');
  if (pendingPdf) dispParts.push('<em style="font-size:11px;opacity:.7">📄 ' + pendingPdf.name + '</em>');
  addMsg('user', dispParts.join('<br>'));

  // Build FormData for server
  var fd = new FormData();
  fd.append('message', txt);
  fd.append('history', JSON.stringify(history));
  if (pendingImage) fd.append('image', pendingImage);
  if (pendingPdf) fd.append('pdf', pendingPdf);

  inp.value = ''; inp.style.height = 'auto';
  document.getElementById('prevs').innerHTML = '';
  var imgSnap = pendingImage; pendingImage = null; pendingPdf = null;

  var tid = showT();

  try {
    var res = await fetch('/api/chat', { method: 'POST', body: fd });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    removeT(tid);
    addMsg('mentor', data.reply.replace(/\n/g, '<br>'));
    history.push({ role: 'user', content: txt || '(uploaded file)' });
    history.push({ role: 'assistant', content: data.reply });

    if (/finished|complete|done!|congrats|you did it|well done|perfect|nailed it|cast.?off|you made it/i.test(data.reply)) {
      confetti();
    }
  } catch (e) {
    removeT(tid);
    addMsg('mentor', '⚠️ ' + (e.message || 'Something went wrong. Please try again.'));
  }

  document.getElementById('sb').disabled = false;
}

function addMsg(role, html) {
  var m = document.getElementById('msgs');
  var d = document.createElement('div');
  d.className = 'msg ' + role;
  d.innerHTML = '<div class="av ' + role + '">' + (role === 'mentor' ? '🧶' : '🙋') + '</div><div class="bubble">' + html + '</div>';
  m.appendChild(d);
  m.scrollTop = m.scrollHeight;
}
function showT() {
  var id = 't' + Date.now();
  var m = document.getElementById('msgs');
  var d = document.createElement('div');
  d.className = 'msg mentor'; d.id = id;
  d.innerHTML = '<div class="av mentor">🧶</div><div class="bubble"><div class="typing"><div class="dot2"></div><div class="dot2"></div><div class="dot2"></div></div></div>';
  m.appendChild(d); m.scrollTop = m.scrollHeight;
  return id;
}
function removeT(id) { var el = document.getElementById(id); if (el) el.remove(); }

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function confetti() {
  var c = document.getElementById('cf');
  var cols = ['#c96b8a','#d4a557','#7a9e87','#f5dde7','#e8f2eb','#f9e4a0','#f0b8cc'];
  for (var i = 0; i < 90; i++) {
    var p = document.createElement('div'); p.className = 'cfp';
    var sz = Math.random() * 10 + 6;
    p.style.cssText = 'left:' + Math.random()*100 + '%;width:' + sz + 'px;height:' + sz + 'px;background:' + cols[Math.floor(Math.random()*cols.length)] + ';border-radius:' + (Math.random()>.5?'50%':'3px') + ';animation-duration:' + (Math.random()*2+2) + 's;animation-delay:' + (Math.random()*.8) + 's;transform:rotate(' + (Math.random()*360) + 'deg)';
    c.appendChild(p);
    setTimeout(function() { p.remove(); }, 4000);
  }
}

// ─── LIGHTBOX ──────────────────────────────────────────────────────────────
function openLightbox() {
  var src = document.getElementById('modal-img').src;
  var alt = document.getElementById('modal-img').alt;
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox-img').alt = alt;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox(e) {
  if (e.target === document.getElementById('lightbox') || e.target === document.querySelector('.lightbox-close')) {
    document.getElementById('lightbox').classList.remove('open');
  }
}
