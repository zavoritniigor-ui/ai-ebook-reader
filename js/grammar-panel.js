/* grammar-panel.js — rendering of the Grammar panel: mode and controls bars, cards, focus detail, adjective forms,
 * verb paradigms, focusGrammarItem (shared with js/practice-worksheet.js). Split out of grammar-svo.js on 2026-11-14 without changes. */
// ========== ГРАМАТИКА: РЕНДЕР ПАНЕЛІ (Verbs/Adjectives cards + focus detail) ==========

function renderGrammarModeBar(langCode) {
    const cfg = grammarConfigFor(langCode);
    const verbsBtn = document.getElementById('grammar-mode-verbs');
    const adjBtn = document.getElementById('grammar-mode-adjectives');
    if (!verbsBtn || !adjBtn) return;
    verbsBtn.textContent = cfg.labels.verbs;
    adjBtn.textContent = cfg.labels.adjectives;
    verbsBtn.classList.toggle('active', grammarContext.mode !== 'adjectives');
    adjBtn.classList.toggle('active', grammarContext.mode === 'adjectives');
    setPanelSubtitle('grammar-subtitle', grammarContext.selectedText);
    if (typeof renderGrammarLookupLabels === 'function') renderGrammarLookupLabels();
}

function ensureGrammarTimelineStyles() {
    if (document.getElementById('grammar-timeline-styles')) return;
    const style = document.createElement('style');
    style.id = 'grammar-timeline-styles';
    style.textContent = `
        .grammar-controls-bar.has-timeline { display: block; min-width: 0; }
        .grammar-time-scroll { width: 100%; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: thin; padding-bottom: 4px; }
        .grammar-time-rail { display: grid; grid-template-columns: 1fr auto 1fr; gap: 8px; width: max-content; min-width: 100%; position: relative; padding: 6px 0; }
        .grammar-time-rail::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: var(--border-color); pointer-events: none; }
        .grammar-time-group { display: flex; align-items: center; gap: 6px; }
        .grammar-time-group[data-time="past"] { justify-content: flex-end; }
        .grammar-time-group[data-time="future"] { justify-content: flex-start; }
        .grammar-time-rail button[data-time] { position: relative; height: 36px; flex-shrink: 0; white-space: nowrap; padding: 0 12px; color: var(--text-color);
            background: color-mix(in srgb, var(--time-color) var(--time-tint), var(--panel-bg));
            border-color: color-mix(in srgb, var(--time-color) 28%, var(--border-color)); }
        .grammar-time-rail button[data-time="past"] { --time-color: color-mix(in srgb, var(--accent-color) 65%, #8b78b5); }
        .grammar-time-rail button[data-time="present"] { --time-color: var(--accent-color); font-weight: 700; }
        .grammar-time-rail button[data-time="future"] { --time-color: color-mix(in srgb, var(--accent-color) 30%, #8d9d72); }
        .grammar-time-rail button[data-time]:hover { box-shadow: inset 0 0 0 1px var(--time-color); }
        .grammar-time-rail button[data-time].active { color: var(--text-color); font-weight: 700; border-color: var(--accent-color); box-shadow: inset 0 0 0 1px var(--accent-color); }
        .grammar-mood-controls { display: flex; flex-wrap: wrap; gap: 6px; padding-top: 6px; }
    `;
    document.head.appendChild(style);
}

function renderGrammarControlsBar(langCode, { preserveScroll = false } = {}) {
    const bar = document.getElementById('grammar-controls-bar');
    if (!bar) return;
    const previous = bar.querySelector('.grammar-time-scroll');
    const oldScroll = preserveScroll && bar.dataset.timelineLang === langCode && previous?.dataset.positioned === '1'
        ? previous.scrollLeft : undefined;
    bar._timelineResizeObserver?.disconnect();
    bar.replaceChildren();
    bar.classList.remove('has-timeline');
    delete bar.dataset.timelineLang;
    if (grammarContext.mode === 'adjectives') return;
    if (!grammarContext.analysis && !grammarContext.focused) return;
    const cfg = grammarConfigFor(langCode);
    function makeButton(tense) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = tense.label;
        btn.dataset.tenseId = tense.id;
        const active = grammarContext.activeTenseId === tense.id;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
        btn.onclick = () => selectGrammarTense(tense.id, tense.label, langCode);
        return btn;
    }
    const timeline = cfg.verb.timeline;
    if (!timeline) { cfg.verb.tenses.forEach(tense => bar.appendChild(makeButton(tense))); return; }
    ensureGrammarTimelineStyles();
    bar.classList.add('has-timeline');
    bar.dataset.timelineLang = langCode;
    const scroll = document.createElement('div');
    scroll.className = 'grammar-time-scroll'; scroll.tabIndex = 0;
    scroll.setAttribute('role', 'group'); scroll.setAttribute('aria-label', timeline.label);
    scroll.title = timeline.label;
    const rail = document.createElement('div'); rail.className = 'grammar-time-rail';
    const placed = new Set();
    for (const side of ['past', 'present', 'future']) {
        const group = document.createElement('div'); group.className = 'grammar-time-group'; group.dataset.time = side;
        const ids = timeline[side];
        ids.forEach((id, index) => {
            const tense = cfg.verb.tenses.find(t => t.id === id);
            if (!tense) return;
            placed.add(id);
            const button = makeButton(tense);
            button.dataset.time = side;
            const distance = side === 'past' ? ids.length - index : side === 'present' ? 0 : index + 1;
            button.style.setProperty('--time-tint', (10 + distance * 4) + '%');
            group.appendChild(button);
        });
        rail.appendChild(group);
    }
    scroll.appendChild(rail); bar.appendChild(scroll);
    const moods = document.createElement('div'); moods.className = 'grammar-mood-controls';
    cfg.verb.tenses.filter(tense => !placed.has(tense.id)).forEach(tense => moods.appendChild(makeButton(tense)));
    if (moods.childElementCount) bar.appendChild(moods);
    function centerPresent() {
        const present = rail.querySelector('[data-tense-id="' + timeline.present[0] + '"]');
        if (!present) return;
        const point = present.getBoundingClientRect(), viewport = scroll.getBoundingClientRect();
        scroll.scrollLeft += point.left + point.width / 2 - viewport.left - viewport.width / 2;
    }
    requestAnimationFrame(() => {
        if (!scroll.isConnected) return;
        if (oldScroll === undefined) centerPresent(); else scroll.scrollLeft = oldScroll;
        scroll.dataset.positioned = '1';
    });
    let width = scroll.clientWidth;
    bar._timelineResizeObserver = new ResizeObserver(() => {
        if (scroll.clientWidth !== width) { width = scroll.clientWidth; centerPresent(); }
    });
    bar._timelineResizeObserver.observe(scroll);
}

// Main list: groups detected occurrences by lemma so a repeated lemma across the
// selection collapses into one card with its distinct surface forms underneath
// (task section 8 — no duplicate-lemma spam), instead of one card per raw hit.
function renderGrammarPanel() {
    const content = els.grammarContent;
    content.innerHTML = '';
    const analysis = grammarContext.analysis;
    if (!analysis) return;
    const wantPos = grammarContext.mode === 'adjectives' ? 'adjective' : 'verb';
    const items = analysis.items.filter(it => it.pos === wantPos);
    // Honest scope notes: a cut-off reply, or a selection too long to analyse whole.
    if (analysis.notice) {
        const notes = [];
        if (analysis.notice.partial) notes.push(t('grammarPartial'));
        if (analysis.notice.trimmed) notes.push(t('grammarTrimmed').replace('{n}', analysis.notice.trimmed.n).replace('{m}', analysis.notice.trimmed.m));
        if (analysis.notice.budgetLimited) notes.push(t('grammarBudgetLimited').replace('{n}', analysis.notice.budgetLimited.n).replace('{m}', analysis.notice.budgetLimited.m));
        for (const note of notes) { const p = document.createElement('p'); p.className = 'grammar-note'; p.textContent = note; content.appendChild(p); }
    }
    if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'grammar-empty';
        empty.textContent = t(wantPos === 'adjective' ? 'grammarEmptyAdjectives' : 'grammarEmptyVerbs');
        content.appendChild(empty);
        return;
    }
    const byLemma = new Map();
    for (const it of items) {
        if (!byLemma.has(it.lemma)) byLemma.set(it.lemma, []);
        byLemma.get(it.lemma).push(it);
    }
    for (const [lemma, occurrences] of byLemma) content.appendChild(buildGrammarCard(lemma, occurrences));
    maybeShowPracticeButton();
}

function buildGrammarCard(lemma, occurrences) {
    const card = document.createElement('div');
    card.className = 'grammar-card';
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'grammar-card-lemma';
    head.textContent = lemma;
    head.onclick = () => focusGrammarItem(occurrences[0]);
    card.appendChild(head);
    // One occurrence: say which form met and in what tense (or gender/number), so the card is informative before it is opened.
    if (occurrences.length === 1) {
        const first = occurrences[0], f = first.features || {};
        const bits = [first.surface && first.surface.toLowerCase() !== lemma.toLowerCase() ? first.surface : '', f.tense || [f.gender, f.number].filter(Boolean).join(' ')].filter(Boolean);
        if (bits.length) { const meta = document.createElement('div'); meta.className = 'grammar-card-meta'; meta.textContent = bits.join(' · '); card.appendChild(meta); }
    }
    if (occurrences.length > 1) {
        const list = document.createElement('div');
        list.className = 'grammar-card-forms';
        occurrences.slice(0, 6).forEach(occ => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'grammar-form-chip';
            b.textContent = occ.surface;
            b.onclick = () => focusGrammarItem(occ);
            list.appendChild(b);
        });
        card.appendChild(list);
    }
    return card;
}

// Wraps the EXACT occurrence (by offset, not by "first substring match") in a <mark> and, more
// lightly, the word it agrees with. Built with createTextNode/createElement, never innerHTML,
// since the sentence text originates from the AI response pipeline (untrusted input).
function appendHighlightedSentence(parent, sentence, surface, start, agreesWith, agreesStart) {
    let idx = Number.isInteger(start) && start >= 0 && surface && sentence.startsWith(surface, start) ? start : -1;
    if (idx === -1 && surface) {
        const found = findSurfaceOccurrences(sentence, surface);
        idx = found.length ? found[0] : sentence.indexOf(surface);
    }
    if (idx === -1) { parent.appendChild(document.createTextNode(sentence)); return; }
    const marks = [{ from: idx, to: idx + surface.length, cls: 'grammar-context-target' }];
    if (agreesWith && Number.isInteger(agreesStart) && agreesStart >= 0 && sentence.startsWith(agreesWith, agreesStart)
        && (agreesStart + agreesWith.length <= idx || agreesStart >= idx + surface.length)) {
        marks.push({ from: agreesStart, to: agreesStart + agreesWith.length, cls: 'grammar-context-agrees' });
    }
    marks.sort((a, b) => a.from - b.from);
    let cursor = 0;
    for (const m of marks) {
        if (m.from > cursor) parent.appendChild(document.createTextNode(sentence.slice(cursor, m.from)));
        const mark = document.createElement('mark');
        mark.className = m.cls;
        mark.textContent = sentence.slice(m.from, m.to);
        parent.appendChild(mark);
        cursor = m.to;
    }
    if (cursor < sentence.length) parent.appendChild(document.createTextNode(sentence.slice(cursor)));
}

// The person (a slot of verb.persons) the SENTENCE names for this occurrence, so the grid of ANY tense can mark it: the subject the verb
// agrees with ("Nous", "ils"), else the person + number features ("1re personne", "pluriel").
function occurrencePersonSlot(item, langCode) {
    const persons = grammarConfigFor(langCode).verb.persons || [];
    if (item.pos !== 'verb' || !persons.length) return null;
    if (item.agreesWith) { const id = resolveFormSlot(String(item.agreesWith), persons); if (id) return id; }
    const f = item.features || {}, n = String(f.person || '').match(/[123]/);
    if (!n) return null;
    const plural = /plur|мн|\bpl\b/i.test(String(f.number || f.person));
    return persons[(Number(n[0]) - 1) + (plural ? 3 : 0)] || null;
}
// An adjective's agreement slot named by the sentence: gender + number features -> ms / fs / mp / fp (when the language declares them).
function occurrenceAdjectiveSlot(item, langCode) {
    const ids = grammarConfigFor(langCode).adjective.forms.map(f => f.id), f = item.features || {};
    const gender = /^(?:m|masc)/i.test(String(f.gender || '')) ? 'm' : /^(?:f|fém|fem)/i.test(String(f.gender || '')) ? 'f' : null;
    const number = /^(?:s|sing)/i.test(String(f.number || '')) ? 's' : /^(?:p|plur)/i.test(String(f.number || '')) ? 'p' : null;
    const id = gender && number ? gender + number : null;
    return id && ids.includes(id) ? id : null;
}
// A conjugation row as it is said: the person's pronoun (the first of «il / elle / on») and the form, French elision included
// («je» + «aime» → «j'aime»). A form that already carries its subject («j'ai mangé», «que je fasse») is said as it is.
const GRAMMAR_SUBJECT_RE = /^(?:qu(?:e\s+|['’])\s*)?(?:j['’]|je|tu|il|elle|on|nous|vous|ils|elles|i|you|he|she|it|we|they)\b/iu;
function grammarRowPhrase(personId, form, langCode) {
    const value = String(form || '').trim();
    if (!value || GRAMMAR_SUBJECT_RE.test(value)) return value;
    const pronoun = String(personId || '').split('/')[0].trim();
    if (!pronoun) return value;
    if (langCode === 'fr' && /^je$/i.test(pronoun) && /^(?:[aeiouyâàéèêëîïôûùœ]|h(?:abit|abill|érit|ésit|onor|umili|umect|ydrat|ypnot|éberg|orrifi|ébét))/i.test(value)) return pronoun.slice(0, 1) + '’' + value;
    return pronoun + ' ' + value;
}
// Says one conjugation row: from the narrations when they have it, else the system voice in the language of the grammar.
function grammarSpeakRow(row, phrase, langCode) {
    if (!phrase) return;
    row.classList.add('speaking');
    setTimeout(() => row.classList.remove('speaking'), 900);
    if (typeof stopTooltipSpeech === 'function' && state.speakingSide) stopTooltipSpeech();
    if (typeof bsStop === 'function') bsStop();
    if (typeof bsSpeakPhrase === 'function' && bsSpeakPhrase(phrase)) return;
    speakInLang(phrase, langCode);
}
function grammarFormLabel(pos, langCode, formId) {
    if (pos !== 'adjective') return formId;
    const match = grammarConfigFor(langCode).adjective.forms.find(f => f.id === formId);
    return match ? match.label : formId;
}

// Renders the detail card for ONE focused occurrence: surface/lemma, its feature
// badges, a stem/ending pattern when linguistically valid, a form/paradigm grid
// (the row matching THIS form highlighted, derived transformations shown), the source
// sentence with the form (and its agreement target) highlighted, and the "why this
// form" explanation. Prepended above the lemma list so it's immediately visible.
function renderGrammarFocusDetail(item, langCode) {
    const content = els.grammarContent;
    content.querySelectorAll('.grammar-focus').forEach(n => n.remove());
    const detail = document.createElement('div');
    detail.className = 'grammar-focus';
    detail.dataset.pos = item.pos;

    const head = document.createElement('div');
    head.className = 'grammar-focus-head';
    const surfaceEl = document.createElement('b');
    surfaceEl.textContent = item.surface;
    head.appendChild(surfaceEl);
    if (item.lemma && item.lemma !== item.surface) {
        const lemmaEl = document.createElement('span');
        lemmaEl.className = 'grammar-focus-lemma';
        lemmaEl.textContent = ' — ' + item.lemma;
        head.appendChild(lemmaEl);
    }
    // A looked-up word: what the learner typed, when it is not already this lemma.
    if (item.query && grammarFold(item.query) !== grammarFold(item.lemma)) {
        const q = document.createElement('span');
        q.className = 'grammar-focus-query';
        q.textContent = ' (' + item.query + ')';
        head.appendChild(q);
    }
    detail.appendChild(head);
    if (item.alternatives && item.alternatives.length) {
        const alts = document.createElement('div');
        alts.className = 'grammar-lookup-alts';
        alts.appendChild(document.createTextNode(t('grammarLookupAlso')));
        for (const alt of item.alternatives) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = alt.note ? alt.lemma + ' — ' + alt.note : alt.lemma;
            b.onclick = () => runGrammarLookup(alt.lemma, { query: item.query, pos: item.pos });
            alts.appendChild(b);
        }
        detail.appendChild(alts);
    }

    const featureEntries = Object.entries(item.features || {});
    if (featureEntries.length) {
        const badges = document.createElement('div');
        badges.className = 'grammar-focus-badges';
        const featureLabels = grammarConfigFor(langCode)[item.pos === 'adjective' ? 'adjective' : 'verb'].featureLabels || {};
        for (const [key, value] of featureEntries) {
            const badge = document.createElement('span');
            badge.className = 'grammar-badge';
            badge.title = key;
            badge.dataset.feature = key;
            badge.textContent = featureLabels[key] ? featureLabels[key] + ': ' + value : String(value);
            badges.appendChild(badge);
        }
        detail.appendChild(badges);
    }

    // The ending of every form in the grid (see verbEndingRanges); the same split gives the tapped form its stem | ending line when the
    // model sent none (an irregular verb is not "unsplittable": faisons is fais|ons).
    const hasGrid = !!(item.forms && Object.keys(item.forms).length);
    const current = hasGrid ? matchingGrammarSlots(item.forms, item.surface) : [];
    // The row(s) holding the occurrence's own FORM are the strong highlight (.current; two rows when two slots share a spelling, rouge ms / fs).
    // When the grid has none -- a tense button showed ANOTHER tense -- the person the sentence names is marked instead (.person, softer).
    const slotId = !hasGrid || current.length ? null : item.pos === 'adjective' ? occurrenceAdjectiveSlot(item, langCode) : occurrencePersonSlot(item, langCode);
    const personRows = slotId && item.forms[slotId] !== undefined ? [slotId] : [];
    const endings = hasGrid && item.pos === 'verb' ? verbEndingRangesByPerson(item.forms, item.lemma, langCode, item.paradigmLabel || (item.features && item.features.tense)) : {};
    let split = item.stemBreakdown;
    if (!split && current.length === 1 && endings[current[0]] && endings[current[0]].length === 1) {
        const cell = String(item.forms[current[0]]), [from, to] = endings[current[0]][0];
        if (!/\s/.test(cell) && grammarComparableForm(cell) === grammarComparableForm(item.surface)) split = { stem: cell.slice(0, from), ending: cell.slice(from, to) };
    }
    if (split) {
        const pattern = document.createElement('div');
        pattern.className = 'grammar-focus-pattern';
        const stemEl = document.createElement('span'); stemEl.className = 'grammar-stem'; stemEl.textContent = split.stem;
        const endEl = document.createElement('span'); endEl.className = 'grammar-ending'; endEl.textContent = split.ending;
        pattern.append(stemEl, endEl);
        detail.appendChild(pattern);
    }

    if (item.agreesWith) {
        const agrees = document.createElement('p');
        agrees.className = 'grammar-focus-agrees';
        const label = document.createElement('b');
        label.textContent = t('grammarAgreesWith') + ': ';
        agrees.append(label, document.createTextNode(item.agreesWith));
        detail.appendChild(agrees);
    }

    if (hasGrid) {
        if (item.paradigmLabel) {
            const gridTitle = document.createElement('div');
            gridTitle.className = 'grammar-grid-title';
            gridTitle.textContent = item.paradigmLabel;
            detail.appendChild(gridTitle);
        }
        const grid = document.createElement('div');
        grid.className = 'grammar-focus-grid';
        for (const [id, formValue] of Object.entries(item.forms)) {
            const row = document.createElement('div'); row.className = 'grammar-grid-row';
            if (current.includes(id)) { row.classList.add('current'); row.setAttribute('aria-current', 'true'); }
            else if (personRows.includes(id)) { row.classList.add('person'); row.setAttribute('aria-current', 'true'); }
            const label = document.createElement('span'); label.className = 'grammar-grid-label'; label.textContent = grammarFormLabel(item.pos, langCode, id);
            const val = document.createElement('span'); val.className = 'grammar-grid-value';
            appendMarkedForm(val, formValue, endings[id]);
            row.append(label, val);
            if (item.pos === 'verb') {
                // one tap on a person's row: that row said as one phrase («tu reçois»), no window (js/book-speech.js, else the system voice)
                const phrase = grammarRowPhrase(id, formValue, langCode);
                row.classList.add('speakable');
                row.tabIndex = 0;
                row.setAttribute('role', 'button');
                row.setAttribute('aria-label', phrase);
                const say = (e) => { e.stopPropagation(); grammarSpeakRow(row, phrase, langCode); };
                row.addEventListener('click', say);
                row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); say(e); } });
            }
            const change = item.transformations && item.transformations[id];
            if (change) {
                const chip = document.createElement('span');
                chip.className = 'grammar-grid-change' + (item.irregularForms && item.irregularForms.includes(id) ? ' irregular' : '');
                chip.textContent = change;
                row.appendChild(chip);
            }
            grid.appendChild(row);
        }
        detail.appendChild(grid);
    } else if (item.pos === 'adjective' && item.formsState === 'loading') {
        const note = document.createElement('p');
        note.className = 'grammar-grid-note grammar-forms-loading';
        note.setAttribute('role', 'status');
        note.textContent = t('generating');
        detail.appendChild(note);
    } else if (item.pos === 'adjective' && item.formsState === 'error') {
        const box = document.createElement('div');
        box.className = 'grammar-forms-error';
        const note = document.createElement('p');
        note.className = 'grammar-grid-note';
        note.setAttribute('role', 'status');
        note.textContent = item.formsError || t('grammarNoParadigm');
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'grammar-forms-retry';
        retry.textContent = t('retry');
        retry.onclick = () => ensureAdjectiveForms(item, langCode, { force: true });
        box.append(note, retry);
        detail.appendChild(box);
    } else if (item.paradigmEmpty && item.paradigmLabel) {
        const note = document.createElement('p');
        note.className = 'grammar-grid-note';
        note.textContent = item.paradigmLabel + ' — ' + t('grammarNoParadigm');
        detail.appendChild(note);
    }

    if (item.sentence) {
        const ctx = document.createElement('p');
        ctx.className = 'grammar-focus-context';
        appendHighlightedSentence(ctx, item.sentence, item.surface, item.start, item.agreesWith, item.agreesStart);
        detail.appendChild(ctx);
    }

    if (item.explanation) {
        const why = document.createElement('p');
        why.className = 'grammar-focus-why';
        const label = document.createElement('b');
        label.textContent = t(item.lookup ? 'grammarAbout' : 'grammarWhy') + ': ';
        why.appendChild(label);
        why.appendChild(document.createTextNode(item.explanation));
        detail.appendChild(why);
    }

    content.prepend(detail);
    content.scrollTop = 0;
}

// Shared cross-panel entry point (task section 13/14/15): called both from a
// Grammar-panel lemma/form chip AND from a clicked highlighted word inside
// Practice's contextual reading — same function, same rendering, so a Practice
// click never needs its own AI round trip when the occurrence data is already known.
// `reveal:false` focuses without opening the drawer (used right after an analysis so the learner's
// own tapped word is already on screen when they open the panel themselves).
function focusGrammarItem(item, langCode, { reveal = true } = {}) {
    langCode = langCode || grammarContext.sourceLanguage || DEFAULT_GRAMMAR_LANG;
    // A conjugation lookup still in flight belongs to the PREVIOUS focus; it must not land on this one.
    cancelAsyncTasks(['grammarParadigm']);
    if (grammarContext.analysis && grammarContext.analysis.language !== langCode) {
        grammarContext.analysis = null;               // another language's results must not leak in
        grammarContext.paradigmCache = new Map();
    }
    grammarContext.sourceLanguage = langCode;
    grammarContext.focused = item;
    // A tense chip belongs to the focus it was pressed on: the detail below now shows THIS item's own
    // forms, so a chip left lit from a previous verb would label the wrong conjugation.
    grammarContext.activeTenseId = null;
    grammarContext.mode = item.pos === 'adjective' ? 'adjectives' : 'verbs';
    renderGrammarModeBar(langCode);
    renderGrammarControlsBar(langCode);
    // The lemma cards list THIS analysis' selection. An occurrence that is not part of it (a Practice
    // target, from a passage the model wrote) must not sit above unrelated cards from the book text.
    if (grammarContext.analysis && grammarContext.analysis.items.includes(item)) renderGrammarPanel();
    else els.grammarContent.replaceChildren();
    renderGrammarFocusDetail(item, langCode);
    if (!reveal) return;
    els.grammarPanel.classList.add('expanded');
    els.grammarPanel.classList.remove('loading');
    els.grammarPanel.classList.add('ready');
    ensureAdjectiveForms(item, langCode);
}

// An adjective's agreement table, asked for when its card is OPENED. The long-selection ("lite") contract sends no table with
// any item (so the reply is not cut off), and a model may leave one out of a short reply too; a verb gets its table from the
// tense buttons, an adjective has none. One small request per lemma (cached for the analysis), a visible "loading" line, a
// visible error with a Retry button. The table must still contain the occurrence's own form, like one sent with the analysis.
function buildAdjectiveFormsPrompt(lemma, langCode) {
    const sourceName = LANGUAGE_CONFIG[langCode]?.promptName || langCode;
    const cfg = grammarConfigFor(langCode).adjective;
    // A slot that exists for a handful of adjectives only (French before-a-vowel bel, nouvel...): named, or models fill it for all.
    const meaning = f => `${f.id} = ${f.label}` + (cfg.specialForms && cfg.specialForms[f.id] ? ` (ONLY for ${Object.keys(cfg.specialForms[f.id]).join(', ')}; null for every other adjective)` : '');
    return `Give the written agreement forms of the ${sourceName} adjective ${JSON.stringify(lemma)}.
Return STRICT JSON only: {"forms":{${cfg.forms.map(f => `"${f.id}":"..."`).join(',')}}}
The keys mean: ${cfg.forms.map(meaning).join('; ')}. Give the real written form for each key (repeat a string only when it truly is identical); use null for a key this adjective has no form for. No markdown, no commentary.`;
}
function adjectiveFormsMissing(item, langCode) {
    return !!item && item.pos === 'adjective' && !item.forms && grammarConfigFor(langCode).adjective.forms.length > 0;
}
async function ensureAdjectiveForms(item, langCode, { force = false } = {}) {
    if (!adjectiveFormsMissing(item, langCode)) return;
    if (item.formsState === 'loading' && item.formsTask && item.formsTask.current()) return;   // a live request is on its way
    if (item.formsState === 'error' && !force) return;           // its message and Retry are on screen; a re-render must not loop
    const focusedNow = () => grammarContext.focused === item;
    const settle = patch => { Object.assign(item, patch); if (focusedNow()) renderGrammarFocusDetail(item, langCode); };
    const accept = rawForms => {
        const out = sanitizeGrammarForms('adjective', langCode, item.lemma, item.surface, rawForms, []);
        if (!out.forms) return false;
        settle({ formsState: undefined, formsError: undefined, formsTask: undefined, forms: out.forms, matchedForm: out.matchedForm, transformations: out.transformations, irregularForms: out.irregularForms });
        return true;
    };
    const cacheKey = 'adj|' + langCode + '|' + item.lemma.toLowerCase();
    const cached = grammarContext.paradigmCache.get(cacheKey);
    if (cached && accept(cached)) return;
    if (!aiCanAnswer()) { settle({ formsState: 'error', formsError: t('needKey'), formsTask: undefined }); return; }
    const prompt = buildAdjectiveFormsPrompt(item.lemma, langCode);
    const task = beginAsyncTask('grammarParadigm');
    // The state belongs to THIS request: a card left while it was loading (the request is cancelled) is asked afresh when it is
    // opened again, and the cancelled request's late reply, if it still arrives, finds another request in charge and does nothing.
    settle({ formsState: 'loading', formsError: undefined, formsTask: task });
    const mine = () => item.formsTask === task;
    try {
        const out = await callAI(prompt, task.signal, 'grammar_paradigm');
        if (!mine()) return;
        if (!task.current() || !focusedNow()) { item.formsState = undefined; item.formsTask = undefined; return; }
        const data = parseAiJsonObject(out);
        const raw = data && data.forms;
        if (accept(raw)) grammarContext.paradigmCache.set(cacheKey, raw);
        else settle({ formsState: 'error', formsError: t('grammarNoParadigm'), formsTask: undefined });
    } catch (err) {
        if (!mine()) return;
        if (!task.current() || !focusedNow() || (err && err.name === 'AbortError')) { item.formsState = undefined; item.formsTask = undefined; return; }
        settle({ formsState: 'error', formsError: err && err.message ? err.message : t('error'), formsTask: undefined });
    }
}

// Puts a fresh (or cached) analysis on screen. When the learner tapped ONE word, that word's own
// occurrence is opened straight away — in the mode of ITS part of speech (a tapped adjective must not
// land on a Verbs list that does not contain it) — instead of a bare lemma list to dig through. A
// tapped word that occurs several times in its sentence cannot be told apart from the tap, so those
// get the right mode and the chips, not a guess; a sentence/paragraph selection has no tapped word.
function presentGrammarAnalysis(analysis, langCode) {
    const tapped = analysis.items.filter(it => it.tapped);
    if (tapped.length === 1) { focusGrammarItem(tapped[0], langCode, { reveal: false }); return; }
    if (tapped.length) grammarContext.mode = tapped[0].pos === 'adjective' ? 'adjectives' : 'verbs';
    renderGrammarModeBar(langCode);
    renderGrammarControlsBar(langCode);
    renderGrammarPanel();
}

async function selectGrammarTense(tenseId, tenseLabel, langCode) {
    grammarContext.activeTenseId = tenseId;
    renderGrammarControlsBar(langCode, { preserveScroll: true });
    const focused = grammarContext.focused;
    if (!focused || focused.pos !== 'verb') return; // nothing focused yet — just remember the choice
    await fetchVerbParadigm(focused, langCode, tenseId, tenseLabel);
}

// Targeted, cached, per-lemma+tense conjugation lookup — the data-driven successor
// to the old buildConjugationPrompt/showVerb pair, generalized to every configured
// language instead of only English/French.
async function fetchVerbParadigm(item, langCode, tenseId, tenseLabel) {
    const cfg = grammarConfigFor(langCode);
    if (!cfg.verb.persons.length) return; // language has no person-based paradigm (e.g. zh)
    const cacheKey = langCode + '|' + item.lemma.toLowerCase() + '|' + tenseId;
    const cached = grammarContext.paradigmCache.get(cacheKey);
    if (cached) { renderGrammarFocusDetail(Object.assign({}, item, { forms: cached, paradigmLabel: tenseLabel }), langCode); return; }
    const task = beginAsyncTask('grammarParadigm');
    const sourceName = LANGUAGE_CONFIG[langCode]?.promptName || langCode;
    const prompt = `Conjugate the ${sourceName} verb ${JSON.stringify(item.lemma)} in the ${tenseLabel}.
Return STRICT JSON only: {"forms":{${cfg.verb.persons.map(p => `"${p}":"..."`).join(',')}}}
Give the actually conjugated form for each person listed, each different where this language genuinely distinguishes them (repeat the same string only when it truly is identical for two persons). No markdown, no commentary.`;
    try {
        const out = await callAI(prompt, task.signal, 'grammar_paradigm');
        // Stale: superseded by a newer lookup, a new book/target language, OR the learner has
        // since focused a different word (a late reply must never show under the wrong verb).
        if (!task.current() || grammarContext.focused !== item) return;
        const data = parseAiJsonObject(out);
        const forms = {};
        if (data && data.forms && typeof data.forms === 'object' && !Array.isArray(data.forms)) {
            for (const p of cfg.verb.persons) {
                const v = data.forms[p];
                if (typeof v === 'string' && v.trim()) forms[p] = normalizeGrammarText(v).slice(0, 80);
            }
        }
        if (Object.keys(forms).length) {
            grammarContext.paradigmCache.set(cacheKey, forms);
            renderGrammarFocusDetail(Object.assign({}, item, { forms, paradigmLabel: tenseLabel }), langCode);
        } else {
            renderGrammarFocusDetail(Object.assign({}, item, { forms: null, paradigmLabel: tenseLabel, paradigmEmpty: true }), langCode);
        }
    } catch (err) {
        // Non-fatal: leave the existing detail card showing rather than an error state.
    }
}

document.getElementById('grammar-mode-verbs').onclick = () => switchGrammarMode('verbs');
document.getElementById('grammar-mode-adjectives').onclick = () => switchGrammarMode('adjectives');
function switchGrammarMode(mode) {
    if (grammarContext.mode === mode) return;
    grammarContext.mode = mode;
    cancelAsyncTasks(['grammarParadigm']);
    const langCode = grammarContext.sourceLanguage || DEFAULT_GRAMMAR_LANG;
    // A focused occurrence of the OTHER part of speech no longer belongs on screen (and its
    // verb-only tense controls must not be able to act on it); one that fits stays visible.
    const focused = grammarContext.focused;
    if (focused && (focused.pos === 'adjective') !== (mode === 'adjectives')) grammarContext.focused = null;
    renderGrammarModeBar(langCode);
    renderGrammarControlsBar(langCode);
    if (grammarContext.analysis || grammarContext.focused) renderGrammarPanel();
    if (grammarContext.focused) renderGrammarFocusDetail(grammarContext.focused, langCode);
}
