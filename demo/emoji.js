// Цветные эмодзи одинаковые на всех компьютерах (как Twemoji): символ эмодзи в тексте заменяется
// картинкой из открытого набора Twemoji (CC-BY 4.0). Раньше для этого загружался чужой скрипт с CDN —
// теперь кода из интернета нет вовсе, а картинка не может ничего выполнить. Нет сети — остаётся
// обычный символ.
(function () {
  const BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/';
  const RE = /(?:\p{RI}\p{RI})|(?:[#*0-9]️?⃣)|(?:\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*)/gu;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE', 'svg', 'SVG', 'TITLE', 'NOSCRIPT']);
  const failed = new Set();
  function code(str) {
    const s = str.indexOf('‍') < 0 ? str.replace(/️/g, '') : str;
    return Array.from(s).map(c => c.codePointAt(0).toString(16)).join('-');
  }
  function isEmoji(m) {
    const cp = m.codePointAt(0);
    // ©, ®, ™ и подобные без «эмодзи-варианта» оставляем текстом.
    return !(cp < 0x2100 && m.indexOf('️') < 0 && m.indexOf('⃣') < 0) && !/^[#*0-9]$/.test(m);
  }
  function onError(e) {
    const img = e.target; failed.add(img.getAttribute('data-c'));
    img.replaceWith(document.createTextNode(img.alt));
  }
  function processNode(node) {
    const text = node.nodeValue;
    RE.lastIndex = 0;
    if (!RE.test(text)) return;
    RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, m, changed = false;
    while ((m = RE.exec(text))) {
      const e = m[0]; const c = code(e);
      if (!isEmoji(e) || failed.has(c)) continue;
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const img = document.createElement('img');
      img.className = 'emoji'; img.draggable = false; img.alt = e; img.setAttribute('data-c', c);
      img.src = BASE + c + '.svg'; img.addEventListener('error', onError, { once: true });
      frag.appendChild(img); last = m.index + e.length; changed = true;
    }
    if (!changed) return;
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }
  function parse(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        for (let p = n.parentNode; p && p !== root.parentNode; p = p.parentNode) {
          if (SKIP.has(p.nodeName) || (p.isContentEditable)) return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const list = []; while (walker.nextNode()) list.push(walker.currentNode);
    list.forEach(processNode);
  }
  window.twemoji = { parse: (root) => parse(root || document.body) };
})();
