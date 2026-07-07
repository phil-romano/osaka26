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

  const state = {
    text: '',
    cities: new Set(),
    categories: new Set(),
    lgbtqOnly: false,
    freeOnly: false,
    hideOngoing: false,
    hideTbd: false,
    view: 'day',
    selectedDay: tripDays[0]
  };

  const els = {
    eventCount: document.getElementById('event-count'),
    verifiedDate: document.getElementById('verified-date'),
    search: document.getElementById('searchInput'),
    cityFilters: document.getElementById('cityFilters'),
    categoryFilters: document.getElementById('categoryFilters'),
    lgbtqOnly: document.getElementById('lgbtqOnly'),
    freeOnly: document.getElementById('freeOnly'),
    hideOngoing: document.getElementById('hideOngoing'),
    hideTbd: document.getElementById('hideTbd'),
    dayPicker: document.getElementById('dayPicker'),
    daySelect: document.getElementById('daySelect'),
    prevDay: document.getElementById('prevDay'),
    nextDay: document.getElementById('nextDay'),
    dayStrip: document.getElementById('dayStrip'),
    categoryLegend: document.getElementById('categoryLegend'),
    resultCount: document.getElementById('resultCount'),
    dayView: document.getElementById('dayView'),
    dayHeading: document.getElementById('day-heading'),
    daySummary: document.getElementById('daySummary'),
    dayCount: document.getElementById('dayCount'),
    dayCategories: document.getElementById('dayCategories'),
    dayAgenda: document.getElementById('dayAgenda'),
    calendarGrid: document.getElementById('calendarGrid'),
    eventList: document.getElementById('eventList'),
    calendar: document.getElementById('calendar'),
    listView: document.getElementById('listView'),
    sourcesView: document.getElementById('sourcesView'),
    sourceList: document.getElementById('sourceList'),
    watchList: document.getElementById('watchList'),
    omittedList: document.getElementById('omittedList')
  };

  init();

  function init() {
    els.eventCount.textContent = events.length;
    els.verifiedDate.textContent = data.generatedAt || '';
    buildFilters();
    buildDaySelect();
    bindEvents();
    renderSources();
    render();
  }

  function bindEvents() {
    els.search.addEventListener('input', () => {
      state.text = els.search.value.trim().toLowerCase();
      render();
    });
    els.lgbtqOnly.addEventListener('change', e => { state.lgbtqOnly = e.target.checked; render(); });
    els.freeOnly.addEventListener('change', e => { state.freeOnly = e.target.checked; render(); });
    els.hideOngoing.addEventListener('change', e => { state.hideOngoing = e.target.checked; render(); });
    els.hideTbd.addEventListener('change', e => { state.hideTbd = e.target.checked; render(); });

    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    els.daySelect.addEventListener('change', e => selectDay(e.target.value, true));
    els.prevDay.addEventListener('click', () => moveDay(-1));
    els.nextDay.addEventListener('click', () => moveDay(1));

    els.dayStrip.addEventListener('click', e => {
      const button = e.target.closest('[data-day-button]');
      if (!button) return;
      selectDay(button.dataset.dayButton, true);
    });

    els.calendarGrid.addEventListener('click', e => {
      const button = e.target.closest('[data-jump-day]');
      if (!button) return;
      selectDay(button.dataset.jumpDay, true);
    });
  }

  function buildFilters() {
    const cities = [...new Set(events.map(e => e.city))].sort();
    const categories = [...new Set(events.map(e => e.category))].sort();
    els.cityFilters.innerHTML = cities.map(c => chipHtml(c, 'city')).join('');
    els.categoryFilters.innerHTML = categories.map(c => chipHtml(c, 'category')).join('');
    els.categoryLegend.innerHTML = categories.map(category => legendPill(category)).join('');
    els.cityFilters.querySelectorAll('button').forEach(btn => wireChip(btn, state.cities));
    els.categoryFilters.querySelectorAll('button').forEach(btn => wireChip(btn, state.categories));
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

  function chipHtml(label, type) {
    const count = events.filter(e => type === 'city' ? e.city === label : e.category === label).length;
    if (type === 'category') {
      return `<button type="button" class="chip category-chip" style="${categoryStyle(label)}" aria-pressed="false" data-value="${escapeAttr(label)}"><span class="category-dot" aria-hidden="true"></span>${escapeHtml(label)} <span aria-hidden="true">${count}</span></button>`;
    }
    return `<button type="button" class="chip" aria-pressed="false" data-value="${escapeAttr(label)}">${escapeHtml(label)} <span aria-hidden="true">${count}</span></button>`;
  }

  function wireChip(btn, set) {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      if (set.has(value)) set.delete(value); else set.add(value);
      btn.setAttribute('aria-pressed', set.has(value) ? 'true' : 'false');
      render();
    });
  }

  function setView(view) {
    state.view = view;
    updateTabs();
    render();
  }

  function updateTabs() {
    document.querySelectorAll('.tab').forEach(btn => {
      const active = btn.dataset.view === state.view;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function selectDay(iso, showDayView) {
    if (!tripDays.includes(iso)) return;
    state.selectedDay = iso;
    els.daySelect.value = iso;
    if (showDayView) state.view = 'day';
    updateTabs();
    render();
    if (showDayView) els.dayView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function moveDay(delta) {
    const index = tripDays.indexOf(state.selectedDay);
    const nextIndex = Math.min(Math.max(index + delta, 0), tripDays.length - 1);
    selectDay(tripDays[nextIndex], true);
  }

  function updateDayButtons() {
    const index = tripDays.indexOf(state.selectedDay);
    els.prevDay.disabled = index <= 0;
    els.nextDay.disabled = index >= tripDays.length - 1;
  }

  function render() {
    const filtered = getFilteredEvents();
    const selectedDayEvents = eventsForDay(filtered, state.selectedDay);

    els.resultCount.textContent = `${filtered.length} event${filtered.length === 1 ? '' : 's'} match the current filters; ${selectedDayEvents.length} on ${formatDay(parseDate(state.selectedDay))}.`;
    els.dayView.classList.toggle('hidden', state.view !== 'day');
    els.calendar.classList.toggle('hidden', state.view !== 'calendar');
    els.listView.classList.toggle('hidden', state.view !== 'list');
    els.sourcesView.classList.toggle('hidden', state.view !== 'sources');

    updateTabs();
    updateDayButtons();
    renderDayStrip(filtered);
    if (state.view === 'day') renderDay(filtered);
    if (state.view === 'calendar') renderCalendar(filtered);
    if (state.view === 'list') renderList(filtered);
  }

  function getFilteredEvents() {
    return events.filter(e => {
      if (state.cities.size && !state.cities.has(e.city)) return false;
      if (state.categories.size && !state.categories.has(e.category)) return false;
      if (state.lgbtqOnly && !e.lgbtq) return false;
      if (state.freeOnly && !(e.cost || '').toLowerCase().includes('free')) return false;
      if (state.hideOngoing && e.isOngoing) return false;
      if (state.hideTbd && e.programTbd) return false;
      if (state.text) {
        const haystack = [e.title, e.city, e.area, e.venue, e.category, e.time, e.cost, e.status, e.sourceName, e.description, e.tip, ...(e.tags || [])].join(' ').toLowerCase();
        if (!haystack.includes(state.text)) return false;
      }
      return true;
    }).sort(compareEvents);
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
    const cityText = Object.entries(cityCounts).map(([city, count]) => `${city}: ${count}`).join(' / ');

    els.daySelect.value = state.selectedDay;
    els.dayHeading.textContent = `${formatFullDate(day)}${state.selectedDay === departure ? ' - Departure day' : ''}`;
    els.dayCount.textContent = dayEvents.length;
    els.daySummary.textContent = dayEvents.length
      ? `${dayEvents.length} matching event${dayEvents.length === 1 ? '' : 's'} for this day. ${cityText}`
      : 'No events match the current filters on this date.';
    els.dayCategories.innerHTML = Object.entries(categoryCounts).map(([category, count]) => (
      `<span class="legend-pill" style="${categoryStyle(category)}"><span class="category-dot" aria-hidden="true"></span>${escapeHtml(category)} <strong>${count}</strong></span>`
    )).join('');
    els.dayAgenda.innerHTML = dayEvents.length ? groupedAgenda(dayEvents) : '<p class="empty">Try clearing a filter, changing cities, or selecting another date.</p>';
  }

  function groupedAgenda(dayEvents) {
    const groups = new Map();
    for (const event of dayEvents) {
      if (!groups.has(event.category)) groups.set(event.category, []);
      groups.get(event.category).push(event);
    }
    return [...groups.entries()].map(([category, items]) => `<section class="day-group" style="${categoryStyle(category)}">
      <header class="day-group__header">
        <h3><span class="category-dot" aria-hidden="true"></span>${escapeHtml(category)}</h3>
        <span>${items.length} event${items.length === 1 ? '' : 's'}</span>
      </header>
      <div class="event-stack">${items.map(eventCard).join('')}</div>
    </section>`).join('');
  }

  function renderCalendar(filtered) {
    els.calendarGrid.innerHTML = tripDays.map(iso => {
      const day = parseDate(iso);
      const dayEvents = eventsForDay(filtered, iso);
      const categoryCounts = countBy(dayEvents, e => e.category);
      return `<article class="day-card ${iso === departure ? 'departure' : ''}">
        <header class="day-card__header">
          <div class="day-card__date"><strong>${formatDay(day)}</strong><span>${iso === departure ? 'Departure day' : formatWeekday(day)}</span></div>
          <div class="day-card__tools">
            <span class="count-badge" aria-label="${dayEvents.length} events">${dayEvents.length}</span>
            <button type="button" class="mini-button mini-button--ghost" data-jump-day="${escapeAttr(iso)}">Open day</button>
          </div>
        </header>
        ${Object.keys(categoryCounts).length ? `<div class="mini-category-strip" aria-label="Categories on ${formatDay(day)}">${Object.keys(categoryCounts).map(category => `<span class="mini-category" style="${categoryStyle(category)}" title="${escapeAttr(category)}"></span>`).join('')}</div>` : ''}
        ${dayEvents.length ? `<div class="event-stack">${dayEvents.map(eventCard).join('')}</div>` : '<p class="empty">No matching events on this date.</p>'}
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
      (e.cost || '').toLowerCase().includes('free') ? '<span class="badge free">Free</span>' : '',
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

  function renderSources() {
    els.sourceList.innerHTML = (data.sources || []).map(item => sourceItem(item.name, item.url, item.note)).join('');
    els.watchList.innerHTML = (data.watchSources || []).map(item => sourceItem(item.name, item.url, item.why)).join('');
    els.omittedList.innerHTML = (data.omitted || []).map(item => `<div class="source-item"><strong>${escapeHtml(item.item)}</strong><p>${escapeHtml(item.reason)}</p></div>`).join('');
  }

  function sourceItem(name, url, note) {
    return `<div class="source-item"><a href="${escapeAttr(url)}" target="_blank" rel="noopener"><strong>${escapeHtml(name)}</strong></a><p>${escapeHtml(note || '')}</p></div>`;
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

  function occursOn(e, iso) {
    return e.dateStart <= iso && e.dateEnd >= iso;
  }

  function parseDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
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

  function formatRange(e) {
    const start = parseDate(e.dateStart);
    const end = parseDate(e.dateEnd);
    if (e.dateStart === e.dateEnd) return `${formatDay(start)}`;
    return `${formatDay(start)}-${formatDay(end)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function escapeAttr(value) { return escapeHtml(value); }
})();
