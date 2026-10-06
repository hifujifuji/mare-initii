(() => {
  const EMPTY = { site: { title: '', latin: '', tagline: '', intro: '', links: [], footer: '' }, gallery: [], sections: [], posts: [] };
  let DATA = window.SITE_DATA || EMPTY;
  let preview = false;      // 後台預覽模式：會顯示草稿文章和隱藏的分頁
  let category = '';        // 畫廊目前的分類篩選
  let currentView = null;
  const blobUrls = {};      // 後台尚未發佈的圖片：路徑 → blob URL

  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const img = p => blobUrls[p] || p;
  const dots = d => esc(String(d || '').replace(/-/g, '.'));
  const paras = t => String(t || '').split(/\n\s*\n/).filter(s => s.trim()).map(s => `<p>${esc(s.trim()).replace(/\n/g, '<br>')}</p>`).join('');
  const draft = '<span class="draft">草稿</span>';

  const sections = () => DATA.sections.filter(s => preview || !s.hidden);
  const live = p => preview || p.published !== false;
  const byDate = (a, b) => String(b.date).localeCompare(String(a.date));
  // 分頁裡的文章照後台排好的順序顯示；還沒排過的舊資料則照日期，新的在前
  const postsOf = s => { const l = DATA.posts.filter(p => p.section === s.id && live(p)); return DATA.manualOrder ? l : l.sort(byDate); };
  const shown = () => DATA.gallery.filter(g => !category || g.category === category);

  const cell = g => `<a class="cell" href="#/gallery/${esc(g.id)}" style="--r:${(g.w / g.h || 1).toFixed(4)}"><img src="${esc(img(g.thumb || g.src))}" alt="${esc(g.title)}" loading="lazy">${g.title ? `<span>${esc(g.title)}</span>` : ''}</a>`;

  const dated = p => p.showDate !== false;   // 每篇文章可以選擇要不要顯示日期
  const postRow = (p, s, withSection) => `<li><a href="#/${esc(s.slug)}/${esc(p.slug)}">
    <div>
      ${dated(p) || withSection ? `<div class="meta">${[dated(p) && dots(p.date), withSection && esc(s.name)].filter(Boolean).join('　')}</div>` : ''}
      <h3>${esc(p.title) || '（未命名）'}${p.published === false ? draft : ''}</h3>
      ${p.summary ? `<p>${esc(p.summary)}</p>` : ''}
      ${(p.tags || []).length ? `<div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    </div>
    ${p.cover ? `<img class="thumb" src="${esc(img(p.cover))}" alt="" loading="lazy">` : ''}</a></li>`;

  function home() {
    const s = DATA.site;
    const works = DATA.gallery.slice(0, 4);
    const latest = sections().flatMap(sec => postsOf(sec).map(p => ({ p, sec }))).sort((a, b) => byDate(a.p, b.p)).slice(0, 5);
    return `
<section class="hero">
  <div class="wrap hero-text">
    ${s.latin ? `<span class="latin">${esc(s.latin)}</span>` : ''}
    <h1>${s.titleImage ? `<img src="${esc(img(s.titleImage.src))}" alt="${esc(s.title)}" width="${+s.titleImage.w}" height="${+s.titleImage.h}">` : esc(s.title)}</h1>
    ${s.tagline ? `<p class="hero-tag">${esc(s.tagline)}</p>` : ''}
  </div>
</section>
${s.intro || s.links.length ? `<section class="wrap lede">${paras(s.intro)}${s.links.length ? `<div class="links">${s.links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</div>` : ''}</section>` : ''}
${works.length ? `<section class="wrap home-sec"><div class="sec-head"><h2>畫廊</h2><a href="#/gallery">看全部 ${DATA.gallery.length} 件作品</a></div><div class="grid few">${works.map(cell).join('')}</div></section>` : ''}
${latest.length ? `<section class="wrap home-sec"><div class="sec-head"><h2>最近更新</h2></div><ul class="posts few">${latest.map(x => postRow(x.p, x.sec, true)).join('')}</ul></section>` : ''}
${!works.length && !latest.length ? '<div class="wrap"><p class="empty">作品和文章放上來之後，會出現在這裡。</p></div>' : ''}`;
  }

  function gallery() {
    const cats = [...new Set(DATA.gallery.map(g => g.category).filter(Boolean))];
    if (category && !cats.includes(category)) category = '';
    const list = shown();
    return `
<div class="wrap page-head"><h1>畫廊</h1></div>
<div class="wrap">
  ${cats.length > 1 ? `<div class="chips">${['', ...cats].map(c => `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === category}">${esc(c) || '全部'}</button>`).join('')}</div>` : ''}
  ${list.length ? `<div class="grid">${list.map(cell).join('')}</div>` : '<p class="empty">還沒有放上作品。</p>'}
</div>`;
  }

  function section(s) {
    const list = postsOf(s);
    return `
<div class="wrap page-head"><h1>${esc(s.name)}${s.hidden ? '<span class="draft">未公開</span>' : ''}</h1>${s.desc ? `<div class="desc">${paras(s.desc)}</div>` : ''}</div>
<div class="wrap">${list.length ? `<ul class="posts">${list.map(p => postRow(p, s)).join('')}</ul>` : '<p class="empty">這個分頁還沒有文章。</p>'}</div>`;
  }

  function article(s, slug) {
    const list = postsOf(s), at = list.findIndex(x => x.slug === slug), p = list[at];
    if (!p) return missing('找不到這篇文章', `<a href="#/${esc(s.slug)}">回「${esc(s.name)}」</a>`);
    const ratio = p.coverW && p.coverH ? ` width="${+p.coverW}" height="${+p.coverH}"` : '';
    return `
<article class="wrap narrow article">
  <a class="back" href="#/${esc(s.slug)}">← ${esc(s.name)}</a>
  <h1>${esc(p.title) || '（未命名）'}${p.published === false ? draft : ''}</h1>
  ${dated(p) || (p.tags || []).length ? `<div class="meta">${[dated(p) && dots(p.date), (p.tags || []).map(esc).join(' / ')].filter(Boolean).join('　')}</div>` : ''}
  ${p.cover ? `<img class="cover" src="${esc(img(p.cover))}" alt=""${ratio}>` : ''}
  <div class="prose${p.indent ? ' indent' : ''}">${p.body || ''}</div>
  ${list.length > 1 ? `<nav class="pager" aria-label="同一個分頁的其他文章">${pagerLink(s, list[at + 1], '上一篇', 'prev')}${pagerLink(s, list[at - 1], '下一篇', 'next')}</nav>` : ''}
</article>`;
  }

  // 列表是新的在上面，所以「上一篇」是列表裡的下一則、「下一篇」是上一則；到頭了就留空位，讓另一邊維持在原本的位置
  const pagerLink = (s, p, label, rel) => p
    ? `<a class="${rel}" rel="${rel}" href="#/${esc(s.slug)}/${esc(p.slug)}"><small>${rel === 'prev' ? '← ' + label : label + ' →'}</small><span>${esc(p.title) || '（未命名）'}</span></a>`
    : '<span></span>';

  const missing = (title, link) => `<div class="wrap page-head"><h1>${title}</h1><p>${link}</p></div>`;

  function lightbox(id) {
    const box = $('#lightbox');
    const list = shown().some(g => g.id === id) ? shown() : DATA.gallery;
    const i = list.findIndex(g => g.id === id);
    if (i < 0) { box.hidden = true; document.body.style.overflow = ''; return; }
    const g = list[i], prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
    box.innerHTML = `
<div class="lb-img"><img src="${esc(img(g.src))}" alt="${esc(g.title)}"></div>
<div class="lb-cap">
  <div>${g.title ? `<h2>${esc(g.title)}</h2>` : ''}<div class="meta">${[dots(g.date), esc(g.category)].filter(Boolean).join('　')}</div>${g.desc ? `<p>${esc(g.desc)}</p>` : ''}</div>
  <div class="lb-ctl">${list.length > 1 ? `<a href="#/gallery/${esc(prev.id)}" aria-label="上一張" data-k="ArrowLeft">←</a><a href="#/gallery/${esc(next.id)}" aria-label="下一張" data-k="ArrowRight">→</a>` : ''}<a href="#/gallery" aria-label="關閉" data-k="Escape">✕</a></div>
</div>`;
    box.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function render(force) {
    const [sec = '', arg = ''] = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
    const s = sec && sec !== 'gallery' ? sections().find(x => x.slug === sec) : null;
    const view = !sec ? 'home' : sec === 'gallery' ? 'gallery' : sec + '/' + arg;
    if (force || view !== currentView) {
      const main = $('#main');
      main.innerHTML = view === 'home' ? home() : view === 'gallery' ? gallery()
        : !s ? missing('找不到這個頁面', '<a href="#/">回首頁</a>') : arg ? article(s, arg) : section(s);
      main.querySelectorAll('.prose img').forEach(el => { const p = el.getAttribute('src'); if (blobUrls[p]) el.src = blobUrls[p]; el.loading = 'lazy'; });
      if (view !== currentView) scrollTo(0, 0);
      currentView = view;
    }
    lightbox(sec === 'gallery' ? arg : '');

    const site = DATA.site, here = sec || 'home';
    const tab = (key, href, label) => `<a href="${href}"${key === here ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
    $('#tabs').innerHTML = tab('home', '#/', '首頁') + tab('gallery', '#/gallery', '畫廊') + sections().map(x => tab(x.slug, '#/' + esc(x.slug), x.name)).join('');
    $('#tabs [aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    $('#brandTitle').textContent = site.title;
    $('#brandLatin').textContent = site.latin;
    $('#footText').textContent = site.footer || `© ${new Date().getFullYear()} ${site.title}`;
    $('#footLatin').textContent = site.latin;
    const page = view === 'home' ? '' : view === 'gallery' ? '畫廊' : s ? s.name : '';
    document.title = page ? `${page} · ${site.title}` : site.title;
  }

  addEventListener('hashchange', () => render());
  addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (b) { category = b.dataset.cat; render(true); }
    if (e.target.classList.contains('lb-img')) location.hash = '#/gallery';
  });
  addEventListener('keydown', e => {
    if ($('#lightbox').hidden) return;
    const a = $(`#lightbox [data-k="${e.key}"]`);
    if (a) location.hash = a.getAttribute('href');
  });

  // 後台編輯器會把這頁放進 iframe，並用 postMessage 送來尚未發佈的草稿
  addEventListener('message', e => {
    if (parent === window || e.source !== parent || e.origin !== location.origin) return;
    const m = e.data;
    if (!m || m.type !== 'site-preview') return;
    preview = true;
    DATA = m.data;
    for (const p in m.blobs || {}) if (!blobUrls[p]) blobUrls[p] = URL.createObjectURL(m.blobs[p]);
    if (m.route && m.route !== location.hash) { currentView = null; location.hash = m.route; }
    render(true);
  });

  render();
})();
