(() => {
  'use strict';

  const data = window.CALENDAR_DATA || {};
  const events = Array.isArray(data.events) ? data.events.slice() : [];
  const trip = data.trip || { start: '2026-10-09', end: '2026-10-21', departure: '2026-10-21' };
  const tripStart = parseDate(trip.start || '2026-10-09');
  const tripEnd = parseDate(trip.end || '2026-10-21');
  const departure = trip.departure || trip.end || '2026-10-21';
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
    'LGBTQ+ / Pride': { line: '#9b1d9b', bg: '#fde7ff', ink: '#5a005f', stripe: 'linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#24408e,#732982)' },
    'Music Festival': { line: '#006c67', bg: '#dff7f5', ink: '#004c48' },
    'Pop Culture / Theme Park': { line: '#b00055', bg: '#ffe5f1', ink: '#79003a' },
    'Temple / Shrine': { line: '#6b5b00', bg: '#fff7cf', ink: '#4a3e00' },
    'Theater / Dance': { line: '#954b00', bg: '#fff0dc', ink: '#653200' },
    'Theater / Performance': { line: '#7a2b83', bg: '#f9e7fb', ink: '#531a5a' },
    'Traditional Festival': { line: '#b23a00', bg: '#fff0e5', ink: '#6f2400' }
  };
  const FALLBACKS = [
    { line: '#525866', bg: '#eef0f5', ink: '#242832' },
    { line: '#006a8a', bg: '#e2f7ff', ink: '#00485d' },
    { line: '#8b3c00', bg: '#fff0e2', ink: '#562600' },
    { line: '#2f6f3e', bg: '#e7f8ec', ink: '#174321' },
    { line: '#7c4d9e', bg: '#f0e9ff', ink: '#482b65' }
  ];

  const $ = id => document.getElementById(id);
  const els = {
    eventCount: $('event-count'),
    verifiedDate: $('verified-date'),
    search: $('searchInput'),
    viewSelect: $('viewSelect'),
    focusSelect: $('focusSelect'),
    citySelect: $('citySelect'),
    categorySelect: $('categorySelect'),
    clearFilters: $('clearFilters'),
    hideOngoing: $('hideOngoing'),
    hideTbd: $('hideTbd'),
    daySelect: $('daySelect'),
    prevDay: $('prevDay'),
    nextDay: $('nextDay'),
    dayStrip: $('dayStrip'),
    categoryLegend: $('categoryLegend'),
    activeFilters: $('activeFilters'),
    resultCount: $('resultCount'),
    dayView: $('dayView'),
    dayHeading: $('day-heading'),
    daySummary: $('daySummary'),
    dayCount: $('dayCount'),
    dayInsights: $('dayInsights'),
    dayAgenda: $('dayAgenda'),
    tripView: $('tripView'),
    tripGrid: $('tripGrid'),
    listView: $('listView'),
    eventList: $('eventList'),
    sourcesView: $('sourcesView'),
    sourceList: $('sourceList'),
    watchList: $('watchList'),
    omittedList: $('omittedList')
  };

  const state = {
    view: 'day',
    focus: 'all',
    city: 'all',
    category: 'all',
    text: '',
    hideOngoing: false,
    hideTbd: false,
    selectedDay: tripDays[0]
  };

  init();

  function init() {
    const missing = Object.entries(els).filter(([, el]) => !el).map(([key]) => key);
    if (missing.length) {
      console.error('Missing required elements:', missing.join(', '));
      return;
    }
    els.eventCount.textContent = events.length;
    els.verifiedDate.textContent = data.generatedAt || '';
    buildSelects();
    buildDaySelect();
    buildLegend();
    bindEvents();
    renderSources();
    render();
  }

  function bindEvents() {
    els.viewSelect.addEventListener('change', () => {
      state.view = els.viewSelect.value;
      render();
      scrollToCurrentView();
    });
    els.focusSelect.addEventListener('change', () => { state.focus = els.focusSelect.value; render(); });
    els.citySelect.addEventListener('change', () => { state.city = els.citySelect.value; render(); });
    els.categorySelect.addEventListener('change', () => { state.category = els.categorySelect.value; render(); });
    els.search.addEventListener('input', () => { state.text = els.search.value.trim().toLowerCase(); render(); });
    els.hideOngoing.addEventListener('change', () => { state.hideOngoing = els.hideOngoing.checked; render(); });
    els.hideTbd.addEventListener('change', () => { state.hideTbd = els.hideTbd.checked; render(); });
    els.clearFilters.addEventListener('click', resetFilters);
    els.daySelect.addEventListener('change', () => selectDay(els.daySelect.value, true));
    els.prevDay.addEventListener('click', () => moveDay(-1));
    els.nextDay.addEventListener('click', () => moveDay(1));
    els.dayStrip.addEventListener('click', event => {
      const button = event.target.closest('[data-day-button]');
      if (!button) return;
      selectDay(button.dataset.dayButton, true);
    });
    els.tripGrid.addEventListener('click', event => {
      const button = event.target.closest('[data-jump-day]');
      if (!button) return;
      selectDay(button.dataset.jumpDay, true);
    });
    document.querySelectorAll('[data-source-jump]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        state.view = 'sources';
        els.viewSelect.value = 'sources';
        render();
        els.sourcesView.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function buildSelects() {
    const cityCounts = countBy(events, e => e.city || 'Unknown');
    const categoryCounts = countBy(events, e => e.category || 'Event');
    els.citySelect.innerHTML = optionHtml('all', `All cities (${events.length})`) + Object.keys(cityCounts).sort().map(city => optionHtml(city, `${city} (${cityCounts[city]})`)).join('');
    els.categorySelect.innerHTML = optionHtml('all', `All categories (${events.length})`) + Object.keys(categoryCounts).sort().map(category => optionHtml(category, `${category} (${categoryCounts[category]})`)).join('');
  }

  function buildDaySelect() {
    els.daySelect.innerHTML = tripDays.map(iso => {
      const day = parseDate(iso);
      const suffix = iso === departure ? ' - departure day' : '';
      return optionHtml(iso, `${formatFullDate(day)}${suffix}`);
    }).join('');
    els.daySelect.value = state.selectedDay;
  }

  function buildLegend() {
    const counts = countBy(events, e => e.category || 'Event');
    els.categoryLegend.innerHTML = Object.keys(counts).sort().map(category => (
      `<span class="legend-pill" style="${categoryStyle(category)}"><span class="category-dot" aria-hidden="true"></span>${escapeHtml(category)} <strong>${counts[category]}</strong></span>`
    )).join('');
  }

  function resetFilters() {
    state.focus = 'all';
    state.city = 'all';
    state.category = 'all';
    state.text = '';
    state.hideOngoing = false;
    state.hideTbd = false;
    els.focusSelect.value = 'all';
    els.citySelect.value = 'all';
    els.categorySelect.value = 'all';
    els.search.value = '';
    els.hideOngoing.checked = false;
    els.hideTbd.checked = false;
    render();
  }

  function selectDay(iso, scroll) {
    if (!tripDays.includes(iso)) return;
    state.selectedDay = iso;
    state.view = 'day';
    els.viewSelect.value = 'day';
    els.daySelect.value = iso;
    render();
    if (scroll) els.dayView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function moveDay(delta) {
    const index = tripDays.indexOf(state.selectedDay);
    const nextIndex = Math.min(Math.max(index + delta, 0), tripDays.length - 1);
    selectDay(tripDays[nextIndex], true);
  }

  function render() {
    const filtered = getFilteredEvents();
    const selectedDayEvents = eventsForDay(filtered, state.selectedDay);
    const selectedDate = parseDate(state.selectedDay);

    els.resultCount.textContent = `${filtered.length} event${filtered.length === 1 ? '' : 's'} match; ${selectedDayEvents.length} on ${formatDay(selectedDate)}.`;
    els.dayView.classList.toggle('hidden', state.view !== 'day');
    els.tripView.classList.toggle('hidden', state.view !== 'trip');
    els.listView.classList.toggle('hidden', state.view !== 'list');
    els.sourcesView.classList.toggle('hidden', state.view !== 'sources');

    renderActiveFilters();
    updateDayButtons();
    renderDayStrip(filtered);
    if (state.view === 'day') renderDay(filtered);
    if (state.view === 'trip') renderTrip(filtered);
    if (state.view === 'list') renderList(filtered);
  }

  function getFilteredEvents() {
    return events.filter(event => {
      if (state.city !== 'all' && event.city !== state.city) return false;
      if (state.category !== 'all' && event.category !== state.category) return false;
      if (state.hideOngoing && event.isOngoing) return false;
      if (state.hideTbd && event.programTbd) return false;
      if (!matchesFocus(event)) return false;
      if (state.text) {
        const haystack = [
          event.title, event.city, event.area, event.venue, event.category, event.time,
          event.cost, event.status, event.sourceName, event.description, event.tip,
          ...(event.tags || [])
        ].join(' ').toLowerCase();
        if (!haystack.includes(state.text)) return false;
      }
      return true;
    }).sort(compareEvents);
  }

  function matchesFocus(event) {
    const category = event.category || '';
    const tags = (event.tags || []).join(' ').toLowerCase();
    const hay = `${category} ${tags} ${event.title || ''} ${event.description || ''}`.toLowerCase();
    switch (state.focus) {
      case 'lgbtq':
        return Boolean(event.lgbtq) || category.toLowerCase().includes('lgbtq') || tags.includes('pride');
      case 'music':
        return ['Concert', 'Music Festival', 'Club / Jazz / Live'].includes(category) || /music|concert|jazz|club|dj|nightlife|live house|live/.test(hay);
      case 'culture':
        return ['Traditional Festival', 'Temple / Shrine', 'Food / Seasonal'].includes(category) || /shrine|temple|festival|market|matsuri|seasonal/.test(hay);
      case 'stage':
        return ['Arts Festival', 'Theater / Dance', 'Theater / Performance', 'Experience / Tour'].includes(category) || /theater|theatre|dance|stage|performance|fringe|arts/.test(hay);
      case 'pop':
        return ['Family / Pop Culture', 'Pop Culture / Theme Park', 'Interactive / Mystery', 'Exhibition / Museum'].includes(category) || /anime|theme park|mystery|escape|museum|exhibition|interactive|pop/.test(hay);
      case 'daytrips':
        return !/^osaka$/i.test(event.city || '');
      case 'free':
        return isFree(event);
      default:
        return true;
    }
  }

  function renderActiveFilters() {
    const pills = [];
    if (state.focus !== 'all') pills.push(`Focus: ${labelFor(els.focusSelect, state.focus)}`);
    if (state.city !== 'all') pills.push(`City: ${state.city}`);
    if (state.category !== 'all') pills.push(`Category: ${state.category}`);
    if (state.text) pills.push(`Search: ${state.text}`);
    if (state.hideOngoing) pills.push('Hiding ongoing items');
    if (state.hideTbd) pills.push('Hiding programme-TBA');
    els.activeFilters.innerHTML = pills.length ? pills.map(pill => `<span class="filter-pill">${escapeHtml(pill)}</span>`).join('') : '<span class="filter-pill">Showing all interests, cities, and categories</span>';
  }

  function updateDayButtons() {
    const index = tripDays.indexOf(state.selectedDay);
    els.prevDay.disabled = index <= 0;
    els.nextDay.disabled = index >= tripDays.length - 1;
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
    const cityCounts = countBy(dayEvents, e => e.city || 'Unknown');
    const categoryCounts = countBy(dayEvents, e => e.category || 'Event');
    const freeCount = dayEvents.filter(isFree).length;
    const tbaCount = dayEvents.filter(e => e.programTbd).length;
    const lgbtqCount = dayEvents.filter(e => e.lgbtq).length;

    els.daySelect.value = state.selectedDay;
    els.dayHeading.textContent = `${formatFullDate(day)}${state.selectedDay === departure ? ' - Departure day' : ''}`;
    els.dayCount.textContent = dayEvents.length;
    els.daySummary.textContent = dayEvents.length
      ? `${dayEvents.length} matching event${dayEvents.length === 1 ? '' : 's'} for this day. ${summarizeCounts(cityCounts)}`
      : 'No events match the current filters on this date.';
    els.dayInsights.innerHTML = insightCards([
      ['Matching events', dayEvents.length],
      ['Cities', Object.keys(cityCounts).length ? summarizeCounts(cityCounts) : 'None'],
      ['Categories', Object.keys(categoryCounts).length ? Object.keys(categoryCounts).length : 0],
      ['LGBTQ+ / Free / TBA', `${lgbtqCount} / ${freeCount} / ${tbaCount}`]
    ]);
    els.dayAgenda.innerHTML = dayEvents.length ? groupedAgenda(dayEvents) : '<p class="empty">Try clearing a filter, changing cities, or selecting another date.</p>';
  }

  function groupedAgenda(dayEvents) {
    const groups = new Map();
    for (const event of dayEvents) {
      const category = event.category || 'Event';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(event);
    }
    return Array.from(groups.entries()).map(([category, items]) => `<section class="day-group" style="${categoryStyle(category)}">
      <header class="day-group__header">
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
      const categories = Object.keys(countBy(dayEvents, e => e.category || 'Event'));
      const preview = dayEvents.slice(0, 5).map(compactEvent).join('');
      const extra = dayEvents.length > 5 ? `<p class="view-summary">+${dayEvents.length - 5} more on this day.</p>` : '';
      return `<article class="trip-day">
        <header class="trip-day__header">
          <div><h3>${formatDay(day)}</h3><small>${iso === departure ? 'Departure day' : formatWeekday(day)}</small></div>
          <span class="count-badge">${dayEvents.length}</span>
        </header>
        ${categories.length ? `<div class="mini-category-strip" aria-label="Categories on ${formatDay(day)}">${categories.map(category => `<span class="mini-category" style="${categoryStyle(category)}" title="${escapeAttr(category)}"></span>`).join('')}</div>` : ''}
        <div class="compact-events">${preview || '<p class="empty">No matching events.</p>'}</div>
        ${extra}
        <button type="button" class="mini-button" data-jump-day="${escapeAttr(iso)}">Open this day</button>
      </article>`;
    }).join('');
  }

  function renderList(filtered) {
    els.eventList.innerHTML = filtered.length
      ? filtered.map(event => `<article class="list-row" style="${categoryStyle(event.category)}"><time>${formatRange(event)}</time>${eventCard(event)}</article>`).join('')
      : '<p class="empty">No events match these filters.</p>';
  }

  function eventCard(event) {
    const style = categoryStyle(event.category);
    const location = [event.venue, event.area, event.city].filter(Boolean).join(' - ');
    const maps = location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location} Japan`)}` : '';
    const badges = [
      `<span class="badge category-badge" style="${style}"><span class="category-dot" aria-hidden="true"></span>${escapeHtml(event.category || 'Event')}</span>`,
      event.lgbtq ? '<span class="badge lgbtq">LGBTQ+</span>' : '',
      isFree(event) ? '<span class="badge free">Free</span>' : '',
      event.programTbd ? '<span class="badge tbd">Programme TBA</span>' : '',
      event.isOngoing ? '<span class="badge">Ongoing</span>' : '',
      `<span class="badge city-badge">${escapeHtml(event.city || 'Unknown')}</span>`
    ].filter(Boolean).join('');
    return `<article class="event-card ${event.priority === 'top' ? 'top' : ''} ${event.lgbtq ? 'event-card--lgbtq' : ''}" style="${style}">
      <h3 class="event-title">${escapeHtml(event.title || 'Untitled event')}</h3>
      <div class="meta">${badges}</div>
      <p class="event-details"><strong>When:</strong> ${escapeHtml(formatRange(event))}${event.time ? `, ${escapeHtml(event.time)}` : ''}</p>
      ${location ? `<p class="event-details"><strong>Where:</strong> ${escapeHtml(location)}</p>` : ''}
      <p class="event-details"><strong>Cost/status:</strong> ${escapeHtml(event.cost || 'Check source')}. ${escapeHtml(event.status || 'Check source')}</p>
      ${event.description ? `<p class="event-details">${escapeHtml(event.description)}</p>` : ''}
      ${event.tip ? `<p class="event-details"><strong>Tip:</strong> ${escapeHtml(event.tip)}</p>` : ''}
      <div class="event-actions">
        ${event.sourceUrl ? `<a href="${escapeAttr(event.sourceUrl)}" target="_blank" rel="noopener">Source</a>` : ''}
        ${maps ? `<a href="${maps}" target="_blank" rel="noopener">Map</a>` : ''}
      </div>
      ${event.tags && event.tags.length ? `<div class="tags">${event.tags.map(tag => `#${escapeHtml(tag)}`).join(' ')}</div>` : ''}
    </article>`;
  }

  function compactEvent(event) {
    return `<div class="compact-event" style="${categoryStyle(event.category)}">
      ${event.sourceUrl ? `<a href="${escapeAttr(event.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(event.title || 'Untitled event')}</a>` : `<strong>${escapeHtml(event.title || 'Untitled event')}</strong>`}
      <span>${escapeHtml([event.category, event.city, event.time].filter(Boolean).join(' · '))}</span>
    </div>`;
  }

  function renderSources() {
    els.sourceList.innerHTML = (data.sources || []).map(item => sourceItem(item.name, item.url, item.note)).join('') || '<p class="empty">No source list included.</p>';
    els.watchList.innerHTML = (data.watchSources || []).map(item => sourceItem(item.name, item.url, item.why)).join('') || '<p class="empty">No watchlist included.</p>';
    els.omittedList.innerHTML = (data.omitted || []).map(item => `<div class="source-item"><strong>${escapeHtml(item.item)}</strong><p>${escapeHtml(item.reason)}</p></div>`).join('') || '<p class="empty">No omissions listed.</p>';
  }

  function sourceItem(name, url, note) {
    return `<div class="source-item">${url ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener"><strong>${escapeHtml(name || url)}</strong></a>` : `<strong>${escapeHtml(name || 'Source')}</strong>`}<p>${escapeHtml(note || '')}</p></div>`;
  }

  function insightCards(items) {
    return items.map(([label, value]) => `<div class="insight-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');
  }

  function scrollToCurrentView() {
    const target = state.view === 'day' ? els.dayView : state.view === 'trip' ? els.tripView : state.view === 'list' ? els.listView : els.sourcesView;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function labelFor(select, value) {
    const option = Array.from(select.options).find(opt => opt.value === value);
    return option ? option.textContent : value;
  }

  function optionHtml(value, label) {
    return `<option value="${escapeAttr(value)}">${escapeHtml(label)}</option>`;
  }

  function categoryStyle(category) {
    const known = CATEGORY_STYLES[category];
    const meta = known || FALLBACKS[Math.abs(hashCode(category || 'Event')) % FALLBACKS.length];
    const stripe = meta.stripe || meta.line;
    return `--cat-line:${meta.line};--cat-bg:${meta.bg};--cat-ink:${meta.ink};--cat-stripe:${stripe};`;
  }

  function eventsForDay(list, iso) {
    return list.filter(event => occursOn(event, iso)).sort(compareEventsForDay);
  }

  function occursOn(event, iso) {
    const start = event.dateStart || event.date || '';
    const end = event.dateEnd || start;
    return start <= iso && end >= iso;
  }

  function isFree(event) {
    const text = `${event.cost || ''} ${(event.tags || []).join(' ')}`.toLowerCase();
    return /free|無料|no charge|admission free/.test(text);
  }

  function compareEvents(a, b) {
    const date = (a.dateStart || '').localeCompare(b.dateStart || '');
    if (date) return date;
    return compareEventsForDay(a, b);
  }

  function compareEventsForDay(a, b) {
    return comparePriorityThenTitle(a, b) || (a.category || '').localeCompare(b.category || '') || (a.city || '').localeCompare(b.city || '');
  }

  function comparePriorityThenTitle(a, b) {
    const priority = { top: 0, high: 1, normal: 2, optional: 3 };
    const ap = priority[a.priority] ?? 2;
    const bp = priority[b.priority] ?? 2;
    return ap - bp || (a.title || '').localeCompare(b.title || '');
  }

  function countBy(items, fn) {
    return items.reduce((acc, item) => {
      const key = fn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function summarizeCounts(counts) {
    return Object.entries(counts).map(([key, value]) => `${key}: ${value}`).join(' / ');
  }

  function parseDate(iso) {
    const [year, month, day] = String(iso).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function toIsoDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function enumerateDays(start, end) {
    const days = [];
    for (const date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
      days.push(new Date(date));
    }
    return days;
  }

  function formatDay(date) {
    return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' });
  }

  function formatShortWeekday(date) {
    return date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
  }

  function formatWeekday(date) {
    return date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' });
  }

  function formatFullDate(date) {
    return date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
  }

  function formatRange(event) {
    const start = parseDate(event.dateStart);
    const end = parseDate(event.dateEnd || event.dateStart);
    if (event.dateStart === event.dateEnd || !event.dateEnd) return formatDay(start);
    return `${formatDay(start)}-${formatDay(end)}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function hashCode(value) {
    let hash = 0;
    for (let i = 0; i < String(value).length; i += 1) {
      hash = ((hash << 5) - hash) + String(value).charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
})();
