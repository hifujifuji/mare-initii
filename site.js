(() => {
  const EMPTY = { site: { title: '', latin: '', tagline: '', intro: '', links: [], footer: '' }, gallery: [], sections: [], posts: [] };
  let DATA = window.SITE_DATA || EMPTY;
  let preview = false;      // 後台預覽模式：會顯示草稿文章和隱藏的分頁
  let category = '';        // 畫廊目前的分類篩選
  let currentView = null;
  let nowSection = null;    // 目前顯示的文章分頁
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
  const galleryName = () => DATA.galleryInfo?.name || '畫廊';
  const shown = () => DATA.gallery.filter(g => !category || g.category === category);

  // 角色縮圖：把原圖放大、移到指定的焦點，裁成正方形。fx、fy 是焦點在原圖上的位置（百分比），zoom 是放大倍率
  function tileStyle(c) {
    const a = (c.w / c.h) || 1, z = Math.max(1, +c.zoom || 1);
    const W = (a >= 1 ? a : 1) * 100 * z, H = (a >= 1 ? 1 : 1 / a) * 100 * z;
    const L = Math.min(0, Math.max(100 - W, 50 - (c.fx ?? 50) / 100 * W)), T = Math.min(0, Math.max(100 - H, 50 - (c.fy ?? 50) / 100 * H));
    return `width:${W.toFixed(2)}%;height:${H.toFixed(2)}%;left:${L.toFixed(2)}%;top:${T.toFixed(2)}%`;
  }

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
    // 連結區塊：每塊有自己的小標題、說明和連結；完全沒填內容的區塊不顯示
    const links = g => (g.links || []).filter(l => l.url);
    const groups = (s.linkGroups || (s.links?.length ? [{ links: s.links }] : [])).filter(g => g.title || g.desc || links(g).length);
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
${s.intro ? `<section class="wrap lede${groups.length ? ' has-next' : ''}">${paras(s.intro)}</section>` : ''}
${groups.length ? `<section class="wrap lg-wrap${s.intro ? '' : ' solo'}"><div class="linkgroups">${groups.map(g => `<div>
  ${g.title ? `<h2>${esc(g.title)}</h2>` : ''}${g.desc ? `<div class="lg-desc">${paras(g.desc)}</div>` : ''}
  ${links(g).length ? `<div class="links">${links(g).map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label) || esc(l.url)}</a>`).join('')}</div>` : ''}
</div>`).join('')}</div></section>` : ''}
${works.length ? `<section class="wrap home-sec"><div class="sec-head"><h2>${esc(galleryName())}</h2><a href="#/gallery">看全部 ${DATA.gallery.length} 件作品</a></div><div class="grid few">${works.map(cell).join('')}</div></section>` : ''}
${latest.length ? `<section class="wrap home-sec"><div class="sec-head"><h2>最近更新</h2></div><ul class="posts few">${latest.map(x => postRow(x.p, x.sec, true)).join('')}</ul></section>` : ''}
${!works.length && !latest.length ? '<div class="wrap"><p class="empty">作品和文章放上來之後，會出現在這裡。</p></div>' : ''}`;
  }

  function gallery() {
    const cats = [...new Set(DATA.gallery.map(g => g.category).filter(Boolean))];
    if (category && !cats.includes(category)) category = '';
    const list = shown();
    return `
<div class="wrap page-head"><h1>${esc(galleryName())}</h1>${DATA.galleryInfo?.desc ? `<div class="desc">${paras(DATA.galleryInfo.desc)}</div>` : ''}</div>
<div class="wrap">
  ${cats.length > 1 ? `<div class="chips">${['', ...cats].map(c => `<button type="button" data-cat="${esc(c)}" aria-pressed="${c === category}">${esc(c) || '全部'}</button>`).join('')}</div>` : ''}
  ${list.length ? `<div class="grid">${list.map(cell).join('')}</div>` : '<p class="empty">還沒有放上作品。</p>'}
</div>`;
  }

  function section(s) {
    const list = postsOf(s), cast = s.cast || [];
    return `
<div class="wrap page-head"><h1>${esc(s.name)}${s.hidden ? '<span class="draft">未公開</span>' : ''}</h1>${s.desc ? `<div class="desc">${paras(s.desc)}</div>` : ''}</div>
${cast.length ? `<div class="wrap"><div class="cast">${cast.map((c, i) => `<button type="button" data-cast="${i}" aria-label="看${esc(c.name) || '這個角色'}的設定"><span class="tile"><img src="${esc(img(c.thumb || c.src))}" alt="" loading="lazy" style="${tileStyle(c)}"></span>${c.name ? `<span class="cname">${esc(c.name)}</span>` : ''}</button>`).join('')}</div></div>` : ''}
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

  // 點角色縮圖後跳出的視窗：左邊是完整的圖，右邊是名字和設定
  function openCast(i) {
    const c = (nowSection?.cast || [])[i], d = $('#cast');
    if (!c) return;
    const text = c.name || c.body;
    d.innerHTML = `<button type="button" class="close" aria-label="關閉">✕</button>
<figure><img src="${esc(img(c.src))}" alt="${esc(c.name)}" width="${+c.w}" height="${+c.h}"></figure>
${text ? `<div class="cast-text">${c.name ? `<h2>${esc(c.name)}</h2>` : ''}${paras(c.body)}</div>` : ''}`;
    d.classList.toggle('solo', !text);
    d.showModal();
  }

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
    nowSection = s;
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
    const menu = sections().map(x => tab(x.slug, '#/' + esc(x.slug), x.name));
    // 畫廊可以排在文章分頁之間：galleryInfo.at 是畫廊前面有幾個文章分頁，這裡只算看得到的
    menu.splice(DATA.sections.slice(0, DATA.galleryInfo?.at || 0).filter(x => preview || !x.hidden).length, 0, tab('gallery', '#/gallery', galleryName()));
    $('#tabs').innerHTML = tab('home', '#/', '首頁') + menu.join('');
    $('#tabs [aria-current]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    $('#brandTitle').textContent = site.title;
    $('#brandLatin').textContent = site.latin;
    $('#footText').textContent = site.footer || `© ${new Date().getFullYear()} ${site.title}`;
    $('#footLatin').textContent = site.latin;
    const page = view === 'home' ? '' : view === 'gallery' ? galleryName() : s ? s.name : '';
    document.title = page ? `${page} · ${site.title}` : site.title;
  }

  addEventListener('hashchange', () => { $('#cast').close(); render(); });
  addEventListener('click', e => {
    const b = e.target.closest('[data-cat]');
    if (b) { category = b.dataset.cat; render(true); }
    if (e.target.classList.contains('lb-img')) location.hash = '#/gallery';
    const c = e.target.closest('[data-cast]');
    if (c) openCast(+c.dataset.cast);
    if (e.target.id === 'cast' || e.target.closest('#cast .close')) $('#cast').close();   // 點視窗外面或右上角的叉叉都會關閉
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
