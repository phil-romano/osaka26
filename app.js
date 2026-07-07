(() => {
  const data = window.CALENDAR_DATA || {};
  const events = data.events || [];
  const tripStart = parseDate(data.trip.start);
  const tripEnd = parseDate(data.trip.end);
  const departure = data.trip.departure;
  const tripDays = enumerateDays(tripStart, tripEnd).map(toIsoDate);

  const CATEGORY_STYLES = {
    'Arts Festival': { line: '#7a3b00', bg: '#fff0e0', ink: '#512700' },
    'Club / Jazz / Live': { line: '#5e3c99', bg: '#eee8ff', ink: '#3a2464' },
    'Concert': { line: '#005f9e', bg: '#e4f3ff', ink: '#003f68' },
    'Exhibition / Museum': { line: '#4d5f00', bg: '#f0f7d5', ink: '#343f00' },
    'Experience / Tour': { line: '#00708c', bg: '#e2f7fb', ink: '#004a5d' },
    'Family / Pop Culture': { line: '#0b7a3d', bg: '#e4f8ec', ink: '#005224' },
    'Food / Seasonal': { line: '#7a5a00', bg: '#fff4d9', ink: '#594100' },
    'Interactive / Mystery': { line: '#0b6b8f', bg: '#e0f6ff', ink: '#004c68' },
    'LGBTQ+ / Pride': { line: '#9b1d9b', bg: '#fde7ff', ink: '#5a005f', rainbow: true },
    'Music Festival': { line: '#006c67', bg: '#dff7f5', ink: '#004c48' },
    'Pop Culture / Theme Park': { line: '#b00055', bg: '#ffe5f1', ink: '#79003a' },
    'Temple / Shrine': { line: '#6b5b00', bg: '#fff7cf', ink: '#4a3e00' },
    'Theater / Dance': { line: '#954b00', bg: '#fff0dc', ink: '#653200' },
    'Theater / Performance': { line: '#7a2b83', bg: '#f9e7fb', ink: '#531a5a' },
    'Traditional Festival': { line: '#b23a00', bg: '#fff0e5', ink: '#6f2400' }
  };
  const FALLBACK_STYLE = { line: '#5f6470', bg: '#eef0f4', ink: '#252932' };

  const FOCUS = {
    all: { label: 'All interests', test: () => true },
    lgbtq: { label: 'LGBTQ+ / Pride only', test: e => Boolean(e.lgbtq || e.category === 'LGBTQ+ / Pride' || hasAnyTag(e, ['lgbtq', 'gay', 'pride'])) },
    music: { label: 'Music and nightlife', test: e => ['Concert', 'Music Festival', 'Club / Jazz / Live'].includes(e.category) || hasAnyTag(e, ['music', 'jazz', 'concert', 'club']) },
    culture: { label: 'Traditional culture', test: e => ['Traditional Festival', 'Temple / Shrine', 'Food / Seasonal'].includes(e.category) || hasAnyTag(e, ['temple', 'shrine', 'festival']) },
    stage: { label: 'Stage and arts', test: e => ['Theater / Performance', 'Theater / Dance', 'Arts Festival', 'Exhibition / Museum'].includes(e.category) },
    pop: { label: 'Pop culture and interactive', test: e => ['Pop Culture / Theme Park', 'Family / Pop Culture', 'Interactive / Mystery', 'Experience / Tour'].includes(e.category) },
    daytrips: { label: 'Kyoto / Nara day trips', test: e => ['Kyoto', 'Nara'].includes(e.city) },
    free: { label: 'Free events', test: e => isFree(e) }
  };

  const state = {
    view: 'day',
    selectedDay: tripDays[0],
    focus: 'all',
    city: '',
    category: '',
    text: '',
    hideOngoing: false,
    hideTbd: false
  };

  const els = {
    eventCount: document.getElementById('event-count'),
    verifiedDate: document.getElementById('verified-date'),
    viewSelect: document.getElementById('viewSelect'),
    focusSelect: document.getElementById('focusSelect'),
    citySelect: document.getElementById('citySelect'),
    categorySelect: document.getElementById('categorySelect'),
    search: document.getElementById('searchInput'),
    hideOngoing: document.getElementById('hideOngoing'),
    hideTbd: document.getElementById('hideTbd'),
    clearFilters: document.getElementById('clearFilters'),
    daySelect: document.getElementById('daySelect'),
    prevDay: document.getElementById('prevDay'),
    nextDay: document.getElementById('nextDay'),
    dayStrip: document.getElementById('dayStrip'),
    categoryLegend: document.getElementById('categoryLegend'),
    activeFilters: document.getElementById('activeFilters'),
    resultCount: document.getElementById('resultCount'),
    dayView: document.getElementById('dayView'),
    tripView: document.getElementById('tripView'),
    listView: document.getElementById('listView'),
    sourcesView: document.getElementById('sourcesView'),
    dayHeading: document.getElementById('day-heading'),
    daySummary: document.getElementById('daySummary'),
    dayCount: document.getElementById('dayCount'),
    dayInsights: document.getElementById('dayInsights'),
    dayAgenda: document.getElementById('dayAgenda'),
    tripGrid: document.getElementById('tripGrid'),
    eventList: document.getElementById('eventList'),
    sourceList: document.getElementById('sourceList'),
    watchList: document.getElementById('watchList'),
    omittedList: document.getElementById('omittedList')
  };

  init();

  function init() {
    els.eventCount.textContent = events.length;
    els.verifiedDate.textContent = data.generatedAt || '';
    buildSelects();
    buildDaySelect();
    bindEvents();
    renderSources();
    render();
  }

  function bindEvents() {
    els.viewSelect.addEventListener('change', e => setView(e.target.value, true));
    els.focusSelect.addEventListener('change', e => { state.focus = e.target.value; render(); });
    els.citySelect.addEventListener('change', e => { state.city = e.target.value; render(); });
    els.categorySelect.addEventListener('change', e => { state.category = e.target.value; render(); });
    els.search.addEventListener('input', e => { state.text = e.target.value.trim().toLowerCase(); render(); });
    els.hideOngoing.addEventListener('change', e => { state.hideOngoing = e.target.checked; render(); });
    els.hideTbd.addEventListener('change', e => { state.hideTbd = e.target.checked; render(); });
    els.clearFilters.addEventListener('click', clearFilters);

    els.daySelect.addEventListener('change', e => selectDay(e.target.value, true));
    els.prevDay.addEventListener('click', () => moveDay(-1));
    els.nextDay.addEventListener('click', () => moveDay(1));

    els.dayStrip.addEventListener('click', e => {
      const button = e.target.closest('[data-day-button]');
      if (!button) return;
      selectDay(button.dataset.dayButton, true);
    });

    els.tripGrid.addEventListener('click', e => {
      const button = e.target.closest('[data-jump-day]');
      if (!button) return;
      selectDay(button.dataset.jumpDay, true);
    });

    document.querySelectorAll('[data-source-jump]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        setView('sources', true);
      });
    });
  }

  function buildSelects() {
    const cities = [...new Set(events.map(e => e.city))].sort();
    const categories = [...new Set(events.map(e => e.category))].sort(categorySort);

    els.citySelect.innerHTML = `<option value="">All cities (${events.length})</option>` + cities.map(city => {
      const count = events.filter(e => e.city === city).length;
      return `<option value="${escapeAttr(city)}">${escapeHtml(city)} (${count})</option>`;
    }).join('');

    els.categorySelect.innerHTML = `<option value="">All categories (${events.length})</option>` + categories.map(category => {
      const count = events.filter(e => e.category === category).length;
      return `<option value="${escapeAttr(category)}">${escapeHtml(category)} (${count})</option>`;
    }).join('');

    els.categoryLegend.innerHTML = categories.map(category => legendPill(category)).join('');
  }

  function buildDaySelect() {
    els.daySelect.innerHTML = tripDays.map(iso => {
      const day = parseDate(iso);
      const count = events.filter(e => occursOn(e, iso)).length;
      const departureLabel = iso === departure ? ' - departure' : '';
      return `<option value="${escapeAttr(iso)}">${formatWeekday(day)} ${formatDay(day)} - ${count} events${departureLabel}</option>`;
    }).join('');
    els.daySelect.value = state.selectedDay;
  }

  function setView(view, shouldScroll) {
    state.view = view;
    els.viewSelect.value = view;
    render();
    if (shouldScroll) currentViewElement().scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectDay(iso, showDayView) {
    if (!tripDays.includes(iso)) return;
    state.selectedDay = iso;
    els.daySelect.value = iso;
    if (showDayView) state.view = 'day';
    els.viewSelect.value = state.view;
    render();
    if (showDayView) els.dayView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function moveDay(delta) {
    const index = tripDays.indexOf(state.selectedDay);
    const nextIndex = Math.min(Math.max(index + delta, 0), tripDays.length - 1);
    selectDay(tripDays[nextIndex], true);
  }

  function clearFilters() {
    state.focus = 'all';
    state.city = '';
    state.category = '';
    state.text = '';
    state.hideOngoing = false;
    state.hideTbd = false;
    els.focusSelect.value = 'all';
    els.citySelect.value = '';
    els.categorySelect.value = '';
    els.search.value = '';
    els.hideOngoing.checked = false;
    els.hideTbd.checked = false;
    render();
  }

  function render() {
    const filtered = getFilteredEvents();
    const selectedDayEvents = eventsForDay(filtered, state.selectedDay);

    els.dayView.classList.toggle('hidden', state.view !== 'day');
    els.tripView.classList.toggle('hidden', state.view !== 'trip');
    els.listView.classList.toggle('hidden', state.view !== 'list');
    els.sourcesView.classList.toggle('hidden', state.view !== 'sources');
    els.clearFilters.disabled = !hasActiveFilters();

    updateDayButtons();
    renderActiveFilters(filtered, selectedDayEvents);
    renderDayStrip(filtered);
    els.resultCount.textContent = `${filtered.length} event${filtered.length === 1 ? '' : 's'} match; ${selectedDayEvents.length} on ${formatDay(parseDate(state.selectedDay))}.`;

    if (state.view === 'day') renderDay(filtered);
    if (state.view === 'trip') renderTrip(filtered);
    if (state.view === 'list') renderList(filtered);
  }

  function getFilteredEvents() {
    const focus = FOCUS[state.focus] || FOCUS.all;
    return events.filter(e => {
      if (!focus.test(e)) return false;
      if (state.city && e.city !== state.city) return false;
      if (state.category && e.category !== state.category) return false;
      if (state.hideOngoing && e.isOngoing) return false;
      if (state.hideTbd && e.programTbd) return false;
      if (state.text) {
        const haystack = [e.title, e.city, e.area, e.venue, e.category, e.time, e.cost, e.status, e.sourceName, e.description, e.tip, ...(e.tags || [])].join(' ').toLowerCase();
        if (!haystack.includes(state.text)) return false;
      }
      return true;
    }).sort(compareEvents);
  }

  function hasActiveFilters() {
    return Boolean(state.focus !== 'all' || state.city || state.category || state.text || state.hideOngoing || state.hideTbd);
  }

  function renderActiveFilters(filtered, selectedDayEvents) {
    const items = [];
    if (state.focus !== 'all') items.push(activePill('Focus', FOCUS[state.focus].label, focusStyle(state.focus)));
    if (state.city) items.push(activePill('City', state.city));
    if (state.category) items.push(activePill('Category', state.category, categoryStyle(state.category)));
    if (state.text) items.push(activePill('Search', state.text));
    if (state.hideOngoing) items.push(activePill('Advanced', 'Hide ongoing'));
    if (state.hideTbd) items.push(activePill('Advanced', 'Hide programme TBA'));

    if (!items.length) {
      els.activeFilters.innerHTML = `<span class="active-filters__empty">No filters active. Showing all ${filtered.length} entries, with ${selectedDayEvents.length} on the selected day.</span>`;
      return;
    }
    els.activeFilters.innerHTML = `<span class="active-filters__label">Active:</span>${items.join('')}`;
  }

  function renderDayStrip(filtered) {
    els.dayStrip.innerHTML = tripDays.map(iso => {
      const day = parseDate(iso);
      const count = eventsForDay(filtered, iso).length;
      return `<button type="button" class="day-strip__button ${iso === state.selectedDay ? 'is-active' : ''}" data-day-button="${escapeAttr(iso)}" aria-pressed="${iso === state.selectedDay ? 'true' : 'false'}">
        <span>${formatDay(day)}</span>
        <small>${iso === departure ? 'Departure' : formatShortWeekday(day)}</small>
        <strong>${count}</strong>
      </button>`;
    }).join('');
  }

  function renderDay(filtered) {
    const day = parseDate(state.selectedDay);
    const dayEvents = eventsForDay(filtered, state.selectedDay);
    const cityCounts = countBy(dayEvents, e => e.city);
    const categoryCounts = countBy(dayEvents, e => e.category);
    const lgbtqCount = dayEvents.filter(e => e.lgbtq || e.category === 'LGBTQ+ / Pride').length;
    const freeCount = dayEvents.filter(isFree).length;

    els.daySelect.value = state.selectedDay;
    els.dayHeading.textContent = `${formatFullDate(day)}${state.selectedDay === departure ? ' - Departure day' : ''}`;
    els.dayCount.textContent = dayEvents.length;
    els.daySummary.textContent = dayEvents.length
      ? `${dayEvents.length} matching event${dayEvents.length === 1 ? '' : 's'} for this day.`
      : 'No events match the current filters on this date.';
    els.dayInsights.innerHTML = dayEvents.length ? [
      insightCard('Cities', summarizeCounts(cityCounts)),
      insightCard('Categories', `${Object.keys(categoryCounts).length} represented`),
      insightCard('LGBTQ+', `${lgbtqCount} on this day`, categoryStyle('LGBTQ+ / Pride')),
      insightCard('Free', `${freeCount} listed as free`)
    ].join('') : '';
    els.dayAgenda.innerHTML = dayEvents.length ? groupedAgenda(dayEvents) : '<p class="empty">Try resetting filters, changing cities, or selecting another date.</p>';
  }

  function groupedAgenda(dayEvents) {
    const groups = new Map();
    for (const event of dayEvents) {
      if (!groups.has(event.category)) groups.set(event.category, []);
      groups.get(event.category).push(event);
    }
    return [...groups.entries()]
      .sort(groupSort)
      .map(([category, items]) => `<section class="agenda-group" style="${categoryStyle(category)}">
        <header class="agenda-group__header">
          <h3><span class="category-dot" aria-hidden="true"></span>${escapeHtml(category)}</h3>
          <span>${items.length} event${items.length === 1 ? '' : 's'}</span>
        </header>
        <div class="event-stack">${items.map(eventCard).join('')}</div>
      </section>`).join('');
  }

  function renderTrip(filtered) {
    els.tripGrid.innerHTML = tripDays.map(iso => {
      const day = parseDate(iso);
      const dayEvents = eventsForDay(filtered, iso);
      const categoryCounts = countBy(dayEvents, e => e.category);
      return `<article class="trip-day ${iso === departure ? 'departure' : ''}">
        <header class="trip-day__header">
          <div class="trip-day__date"><strong>${formatDay(day)}</strong><span>${iso === departure ? 'Departure day' : formatWeekday(day)}</span></div>
          <div class="trip-day__tools">
            <span class="count-badge" aria-label="${dayEvents.length} events">${dayEvents.length}</span>
            <button type="button" class="mini-button mini-button--ghost" data-jump-day="${escapeAttr(iso)}">Open day</button>
          </div>
        </header>
        ${Object.keys(categoryCounts).length ? `<div class="mini-category-strip" aria-label="Categories on ${formatDay(day)}">${Object.keys(categoryCounts).sort(categorySort).map(category => `<span class="mini-category" style="${categoryStyle(category)}" title="${escapeAttr(category)}"></span>`).join('')}</div>` : ''}
        ${dayEvents.length ? `<div class="compact-list">${dayEvents.map(compactEvent).join('')}</div>` : '<p class="empty">No matching events on this date.</p>'}
      </article>`;
    }).join('');
  }

  function renderList(filtered) {
    els.eventList.innerHTML = filtered.map(e => `<article class="list-row" style="${categoryStyle(e.category)}">
      <time>${formatRange(e)}</time>
      ${eventCard(e)}
    </article>`).join('') || '<p class="empty">No events match these filters.</p>';
  }

  function eventCard(e) {
    const maps = e.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.venue + ' ' + e.city + ' Japan')}` : '';
    const style = categoryStyle(e.category);
    const badges = [
      `<span class="badge category-badge" style="${style}"><span class="category-dot" aria-hidden="true"></span>${escapeHtml(e.category)}</span>`,
      e.lgbtq ? '<span class="badge lgbtq">LGBTQ+</span>' : '',
      isFree(e) ? '<span class="badge free">Free</span>' : '',
      e.programTbd ? '<span class="badge tbd">Programme TBA</span>' : '',
      e.isOngoing ? '<span class="badge">Ongoing</span>' : '',
      `<span class="badge city-badge">${escapeHtml(e.city)}</span>`
    ].filter(Boolean).join('');
    return `<article class="event-card ${e.priority === 'top' ? 'top' : ''} ${e.lgbtq ? 'event-card--lgbtq' : ''}" style="${style}">
      <h3 class="event-title">${escapeHtml(e.title)}</h3>
      <div class="meta">${badges}</div>
      <p class="event-details"><strong>When:</strong> ${escapeHtml(formatRange(e))}${e.time ? `, ${escapeHtml(e.time)}` : ''}</p>
      <p class="event-details"><strong>Where:</strong> ${escapeHtml([e.venue, e.area, e.city].filter(Boolean).join(' - '))}</p>
      <p class="event-details"><strong>Cost/status:</strong> ${escapeHtml(e.cost)}. ${escapeHtml(e.status)}</p>
      ${e.description ? `<p class="event-details">${escapeHtml(e.description)}</p>` : ''}
      ${e.tip ? `<p class="event-details"><strong>Tip:</strong> ${escapeHtml(e.tip)}</p>` : ''}
      <div class="event-actions">
        ${e.sourceUrl ? `<a href="${escapeAttr(e.sourceUrl)}" target="_blank" rel="noopener">Source</a>` : ''}
        ${maps ? `<a href="${maps}" target="_blank" rel="noopener">Map</a>` : ''}
      </div>
      <div class="tags">${(e.tags || []).map(t => `#${escapeHtml(t)}`).join(' ')}</div>
    </article>`;
  }

  function compactEvent(e) {
    const style = categoryStyle(e.category);
    return `<article class="compact-event" style="${style}">
      <span class="category-dot" aria-hidden="true"></span>
      <div>
        <h3>${escapeHtml(e.title)}</h3>
        <p>${escapeHtml([e.venue, e.city].filter(Boolean).join(' - '))}${e.time ? ` - ${escapeHtml(e.time)}` : ''}</p>
      </div>
      ${e.sourceUrl ? `<a href="${escapeAttr(e.sourceUrl)}" target="_blank" rel="noopener">Source</a>` : ''}
    </article>`;
  }

  function renderSources() {
    els.sourceList.innerHTML = (data.sources || []).map(item => sourceItem(item.name, item.url, item.note)).join('');
    els.watchList.innerHTML = (data.watchSources || []).map(item => sourceItem(item.name, item.url, item.why)).join('');
    els.omittedList.innerHTML = (data.omitted || []).map(item => `<div class="source-item"><strong>${escapeHtml(item.item)}</strong><p>${escapeHtml(item.reason)}</p></div>`).join('');
  }

  function sourceItem(name, url, note) {
    return `<div class="source-item"><a href="${escapeAttr(url)}" target="_blank" rel="noopener"><strong>${escapeHtml(name)}</strong></a><p>${escapeHtml(note || '')}</p></div>`;
  }

  function insightCard(label, value, style) {
    return `<div class="insight-card" ${style ? `style="${style}"` : ''}><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  }

  function activePill(label, value, style) {
    return `<span class="active-pill" ${style ? `style="${style}"` : ''}><small>${escapeHtml(label)}</small>${escapeHtml(value)}</span>`;
  }

  function legendPill(category) {
    const count = events.filter(e => e.category === category).length;
    return `<span class="legend-pill" style="${categoryStyle(category)}"><span class="category-dot" aria-hidden="true"></span>${escapeHtml(category)} <strong>${count}</strong></span>`;
  }

  function categoryStyle(category) {
    const meta = CATEGORY_STYLES[category] || FALLBACK_STYLE;
    const stripe = meta.rainbow ? 'linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#24408e,#732982)' : meta.line;
    return `--cat-line:${meta.line};--cat-bg:${meta.bg};--cat-ink:${meta.ink};--cat-stripe:${stripe};`;
  }

  function focusStyle(focus) {
    if (focus === 'lgbtq') return categoryStyle('LGBTQ+ / Pride');
    if (focus === 'music') return categoryStyle('Music Festival');
    if (focus === 'culture') return categoryStyle('Traditional Festival');
    if (focus === 'stage') return categoryStyle('Theater / Performance');
    if (focus === 'pop') return categoryStyle('Pop Culture / Theme Park');
    if (focus === 'daytrips') return categoryStyle('Temple / Shrine');
    if (focus === 'free') return '--cat-line:#167c5c;--cat-bg:#dff5ee;--cat-ink:#0b5d43;--cat-stripe:#167c5c;';
    return '';
  }

  function updateDayButtons() {
    const index = tripDays.indexOf(state.selectedDay);
    els.prevDay.disabled = index <= 0;
    els.nextDay.disabled = index >= tripDays.length - 1;
  }

  function currentViewElement() {
    if (state.view === 'trip') return els.tripView;
    if (state.view === 'list') return els.listView;
    if (state.view === 'sources') return els.sourcesView;
    return els.dayView;
  }

  function eventsForDay(list, iso) {
    return list.filter(e => occursOn(e, iso)).sort(compareEventsForDay);
  }

  function countBy(items, fn) {
    return items.reduce((acc, item) => {
      const key = fn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function summarizeCounts(counts) {
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return entries.map(([key, value]) => `${key} ${value}`).join(' / ');
  }

  function categorySort(a, b) {
    if (a === 'LGBTQ+ / Pride') return -1;
    if (b === 'LGBTQ+ / Pride') return 1;
    const aCount = events.filter(e => e.category === a).length;
    const bCount = events.filter(e => e.category === b).length;
    return bCount - aCount || a.localeCompare(b);
  }

  function groupSort(a, b) {
    if (a[0] === 'LGBTQ+ / Pride') return -1;
    if (b[0] === 'LGBTQ+ / Pride') return 1;
    return b[1].length - a[1].length || categorySort(a[0], b[0]);
  }

  function compareEvents(a, b) {
    const ad = a.dateStart.localeCompare(b.dateStart);
    if (ad) return ad;
    return comparePriorityThenTitle(a, b);
  }

  function compareEventsForDay(a, b) {
    if (!!a.isOngoing !== !!b.isOngoing) return a.isOngoing ? 1 : -1;
    if (!!a.programTbd !== !!b.programTbd) return a.programTbd ? 1 : -1;
    return comparePriorityThenTitle(a, b);
  }

  function comparePriorityThenTitle(a, b) {
    const priority = { top: 0, high: 1, normal: 2, optional: 3 };
    return (priority[a.priority] ?? 2) - (priority[b.priority] ?? 2) || a.title.localeCompare(b.title);
  }

  function hasAnyTag(event, needles) {
    const tags = (event.tags || []).map(t => String(t).toLowerCase());
    return needles.some(needle => tags.some(tag => tag.includes(needle)));
  }

  function isFree(event) {
    return (event.cost || '').toLowerCase().includes('free');
  }

  function occursOn(event, iso) {
    return event.dateStart <= iso && event.dateEnd >= iso;
  }

  function parseDate(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function toIsoDate(dt) { return dt.toISOString().slice(0, 10); }

  function enumerateDays(start, end) {
    const out = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) out.push(new Date(d));
    return out;
  }

  function formatDay(dt) { return dt.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }); }
  function formatWeekday(dt) { return dt.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' }); }
  function formatShortWeekday(dt) { return dt.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' }); }
  function formatFullDate(dt) { return dt.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' }); }

  function formatRange(event) {
    const start = parseDate(event.dateStart);
    const end = parseDate(event.dateEnd);
    if (event.dateStart === event.dateEnd) return `${formatDay(start)}`;
    return `${formatDay(start)}-${formatDay(end)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function escapeAttr(value) { return escapeHtml(value); }
})();
