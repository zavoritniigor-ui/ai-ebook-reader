// ========== ПРИВІТАЛЬНЕ ВІДЕО ПРИ ВІДКРИТТІ ЗАСТОСУНКУ (owner, 2026-10-28) ==========
// Every time the app is opened, a 4.5 s welcome video plays over the whole screen: the book, the title, a fade to black at the
// end; then the app shows through. The browser takes the WebM or the MP4, whichever it plays. «Opened» is a new browser session:
// a reload of the same session (the «Оновити» banner, Android bringing back a page it unloaded in the background) does not play
// it again. Not with «reduce motion»; not offline (the video is not in the offline cache: it fails to load and the app is there
// at once). A tap skips it. This file runs before the rest of the page is parsed (index.html loads it right after #app-welcome)
// and refers to nothing in the other modules.
(function () {
    const welcome = document.getElementById('app-welcome');
    if (!welcome) return;
    let show = !window.__readerNoWelcome;   // the browser tests start without it (tests/browser_cdp.py); tests/welcome_browser.py checks it
    try {
        if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) show = false;
        if (sessionStorage.getItem('reader_welcome_played')) show = false;
        if (show) sessionStorage.setItem('reader_welcome_played', '1');
    } catch (e) { /* no storage: it simply plays */ }
    if (!show) { welcome.remove(); return; }
    const video = welcome.querySelector('video');
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        welcome.classList.add('welcome-out');
        setTimeout(() => welcome.remove(), 400);
    };
    welcome.hidden = false;
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish, true);   // a <source> that fails reports on itself, not on the video
    welcome.addEventListener('pointerdown', finish);
    const playing = video.play();
    if (playing && playing.catch) playing.catch(finish);   // autoplay refused: no frozen first frame
    setTimeout(finish, 6500);   // a video that stalls never holds the app back
})();
