// ========== ПРИВІТАЛЬНЕ ВІДЕО ПРИ ВІДКРИТТІ ЗАСТОСУНКУ (owner, 2026-10-28) ==========
// A 4.5 s welcome video plays over the whole screen when the app is opened for the first time, or after it has not been used for
// a long time (WELCOME_IDLE_MS), then the app shows through. Put aside for a while (a look at the files, a YouTube video) and
// brought back sooner, it is not played: the owner's rule. «Used» is the last moment the app was on screen, kept on the device;
// it counts both a new start of the page and an app brought back from the background without a reload.
// The browser takes the WebM or the MP4, whichever it plays. It is shown at its own size at most, never stretched (index.html). Not with «reduce motion»; not offline (the video is not in the
// offline cache: it fails to load and the app is there at once). A tap skips it. This file runs before the rest of the page is
// parsed (index.html loads it right after #app-welcome) and refers to nothing in the other modules.
(function () {
    const welcome = document.getElementById('app-welcome');
    if (!welcome) return;
    const WELCOME_IDLE_MS = 30 * 60 * 1000, SEEN_KEY = 'reader_last_seen';
    const lastSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch (e) { return 0; } };
    const markSeen = () => { try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch (e) { /* not remembered: it plays next time */ } };
    const wanted = () => !window.__readerNoWelcome   // the browser tests start without it (tests/browser_cdp.py); tests/welcome_browser.py checks it
        && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
        && Date.now() - lastSeen() >= WELCOME_IDLE_MS;
    const video = welcome.querySelector('video');
    let timer = null, playingNow = false;
    const finish = () => {
        if (!playingNow) return;
        playingNow = false;
        clearTimeout(timer);
        welcome.classList.add('welcome-out');
        setTimeout(() => { if (!playingNow) { welcome.hidden = true; video.pause(); } }, 400);
    };
    // its own pixels at most: as wide as the screen allows (and its height), never wider than 1280 device pixels
    const fit = () => {
        const native = 1280 / (window.devicePixelRatio || 1);
        welcome.style.setProperty('--welcome-w', Math.floor(Math.min(native, innerWidth, innerHeight * 16 / 9)) + 'px');
    };
    window.addEventListener('resize', () => { if (playingNow) fit(); });
    const play = () => {
        fit();
        playingNow = true;
        welcome.classList.remove('welcome-out');
        welcome.hidden = false;
        try { video.currentTime = 0; } catch (e) { /* not loaded yet: it starts at 0 anyway */ }
        const p = video.play();
        if (p && p.catch) p.catch(finish);   // autoplay refused: no frozen first frame
        timer = setTimeout(finish, 6500);   // a video that stalls never holds the app back
    };
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish, true);   // a <source> that fails reports on itself, not on the video
    welcome.addEventListener('pointerdown', finish);
    if (wanted()) play();
    markSeen();
    // the time on screen counts as use: kept while the app is open, and the moment it is put aside
    setInterval(() => { if (document.visibilityState === 'visible') markSeen(); }, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') { markSeen(); return; }
        if (wanted()) play();   // brought back after a long time away
        markSeen();
    });
    window.addEventListener('pagehide', markSeen);
})();
