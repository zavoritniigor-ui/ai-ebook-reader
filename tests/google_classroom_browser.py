"""Google Classroom + Drive integration (js/google-classroom.js): sign-in ->
"My courses" -> course -> one card per coursework/material (title, Assignment/
Material badge, due-or-published date, short description, Drive attachments
listed directly under the card, no separate attachments screen) -> opening an
attachment loads it directly in the Reader, no manual download. Google
Identity Services and the Classroom/Drive REST calls are mocked (real
accounts.google.com is blocked at the network level so the mock is never
raced by a real script load); the app's own DOM, event wiring, minimal-scope
request, and file-loading pipeline are real. READER_TTS_URL can target
production (network to Google is still blocked).
"""
import base64, json, os
from browser_cdp import CDP, pdf_bytes
c = CDP(); c.sock.settimeout(40); c.call('Page.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
# Never let a real Google Identity Services script load and race the mock below —
# deterministic regardless of this sandbox's actual network reachability.
c.call('Network.setBlockedURLs', urls=['*accounts.google.com*'])
c.call('Page.addScriptToEvaluateOnNewDocument', source='''
window.__errors=[];
addEventListener('error',e=>__errors.push(e.message));
addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
''')
c.call('Page.navigate', url=os.environ.get('READER_TTS_URL', 'http://127.0.0.1:8765/index.html'))
c.wait("document.readyState==='complete' && !document.body.inert")


def js(expr):
    return c.js(expr)


def check(name, expr):
    v = js(expr)
    assert v is True, (name, v)
    print('PASS', name, flush=True)


# ---- Fixtures: a fake course, one courseWork (assignment, with a due date, a
# description and a Drive attachment) and two courseWorkMaterial items (one
# with a Google Doc attachment that must be exported, one with a plain-text
# attachment and no description, to check the description line is optional) ----
pdf_b64 = base64.b64encode(pdf_bytes()).decode()
FIXTURES = {
    'courses': {'courses': [{'id': 'c1', 'name': 'Français A2', 'section': 'Groupe 3'}]},
    'courseWork': {'courseWork': [{
        'id': 'w1', 'title': 'Lecture: Le Petit Prince (extrait)',
        'description': 'Lisez le chapitre 1 et répondez aux questions à la fin du texte avant le prochain cours.',
        'dueDate': {'year': 2026, 'month': 3, 'day': 15}, 'creationTime': '2026-01-02T12:00:00Z',
        'materials': [{'driveFile': {'driveFile': {'id': 'drive-pdf-1', 'title': 'extrait.pdf'}}}]
    }]},
    'courseWorkMaterials': {'courseWorkMaterial': [{
        'id': 'm1', 'title': 'Notes de cours (Google Doc)', 'creationTime': '2026-01-01T12:00:00Z',
        'description': 'Résumé du vocabulaire vu en classe cette semaine.',
        'materials': [
            {'driveFile': {'driveFile': {'id': 'drive-doc-1', 'title': 'Notes'}}},
            {'link': {'url': 'https://example.com/not-openable'}},
        ]
    }, {
        'id': 'm2', 'title': 'Vocabulaire (texte brut)', 'creationTime': '2025-12-30T12:00:00Z',
        'materials': [{'driveFile': {'driveFile': {'id': 'drive-txt-1', 'title': 'vocabulaire.txt'}}}]
    }]},
    'meta-pdf': {'id': 'drive-pdf-1', 'name': 'extrait.pdf', 'mimeType': 'application/pdf', 'size': '1234'},
    'meta-doc': {'id': 'drive-doc-1', 'name': 'Notes', 'mimeType': 'application/vnd.google-apps.document'},
    'meta-txt': {'id': 'drive-txt-1', 'name': 'vocabulaire.txt', 'mimeType': 'text/plain', 'size': '42'},
}

setup = js('''(()=>{
    window.__calls = [];
    window.__tokenClientArgs = null;
    // English UI for predictable assertions below — not itself under test here.
    state.uiLang = 'en';
    // Mock Google Identity Services: initTokenClient records the scope, and
    // requestAccessToken immediately "succeeds" with a fake token.
    window.google = { accounts: { oauth2: {
        initTokenClient(args) { window.__tokenClientArgs = args; return {
            requestAccessToken() { setTimeout(() => args.callback({ access_token: 'fake-token', expires_in: 3600 }), 0); }
        }; },
        revoke(token, cb) { window.__revoked = token; cb && cb(); }
    } } };
    const FIXTURES = ''' + json.dumps(FIXTURES) + ''';
    const pdfBytes = Uint8Array.from(atob(''' + json.dumps(pdf_b64) + '''), c => c.charCodeAt(0));
    window.fetch = async (url, opts) => {
        const u = String(url);
        window.__calls.push({ url: u, auth: opts && opts.headers && opts.headers.Authorization });
        if (u.includes('classroom.googleapis.com') && u.includes('/courses?')) return new Response(JSON.stringify(FIXTURES.courses));
        if (u.includes('/courseWork?')) return new Response(JSON.stringify(FIXTURES.courseWork));
        if (u.includes('/courseWorkMaterials?')) return new Response(JSON.stringify(FIXTURES.courseWorkMaterials));
        if (u.includes('drive-pdf-1') && u.includes('alt=media')) return new Response(pdfBytes, { headers: { 'Content-Type': 'application/pdf' } });
        if (u.includes('drive-pdf-1')) return new Response(JSON.stringify(FIXTURES['meta-pdf']));
        if (u.includes('drive-doc-1') && u.includes('/export')) return new Response(pdfBytes, { headers: { 'Content-Type': 'application/pdf' } });
        if (u.includes('drive-doc-1')) return new Response(JSON.stringify(FIXTURES['meta-doc']));
        if (u.includes('drive-txt-1') && u.includes('alt=media')) return new Response('Bonjour le monde.', { headers: { 'Content-Type': 'text/plain' } });
        if (u.includes('drive-txt-1')) return new Response(JSON.stringify(FIXTURES['meta-txt']));
        return new Response('not found', { status: 404 });
    };
    return true;
})()''')
assert setup is True

# ---- 1. Not signed in yet: opening the modal shows the sign-in view --------
check('opens to sign-in view when not authenticated', '''(()=>{
    document.getElementById('btn-classroom').click();
    return document.getElementById('classroom-view-signin').style.display !== 'none'
        && topOpenOverlay() === 'classroom';
})()''')

# ---- 2. Sign in -> courses list ---------------------------------------------
signin_result = js('''(async()=>{
    document.getElementById('classroom-signin-btn').click();
    await new Promise(r => setTimeout(r, 30));
    const list = document.getElementById('classroom-courses-list');
    return { scope: window.__tokenClientArgs.scope, coursesShown: document.getElementById('classroom-view-courses').style.display !== 'none',
             courseText: list.textContent };
})()''')
assert 'classroom.courses.readonly' in signin_result['scope'], signin_result
assert 'classroom.coursework.me.readonly' in signin_result['scope'], signin_result
assert 'classroom.courseworkmaterials.readonly' in signin_result['scope'], signin_result
assert 'drive.readonly' in signin_result['scope'], signin_result
# Requirement: this is a student-only read-only flow — classroom.coursework.
# students.readonly (teacher visibility into OTHER students' work) is not
# needed and must not be requested.
assert 'classroom.coursework.students.readonly' not in signin_result['scope'], signin_result
assert signin_result['coursesShown'], signin_result
assert 'Français A2' in signin_result['courseText'], signin_result
print('PASS sign-in requests only minimal, read-only scopes and shows courses', flush=True)

# ---- 3. Pick the course -> one card per coursework/material item -----------
work_result = js('''(async()=>{
    document.getElementById('classroom-courses-list').querySelector('li').click();
    await new Promise(r => setTimeout(r, 30));
    const list = document.getElementById('classroom-coursework-list');
    const cards = [...list.querySelectorAll('li.classroom-card')];
    return {
        shown: document.getElementById('classroom-view-coursework').style.display !== 'none',
        cardCount: cards.length,
        // No separate attachments screen anymore — it must not exist at all.
        attachmentsViewGone: !document.getElementById('classroom-view-attachments'),
    };
})()''')
assert work_result['shown'] and work_result['cardCount'] == 3, work_result
assert work_result['attachmentsViewGone'], work_result
print('PASS course selection renders one card per coursework/material item', flush=True)

# ---- 4. The assignment card shows title, type, due date, description and
# its attachment — all grouped under the SAME card, no navigation needed -----
work_card = js('''(()=>{
    const cards = [...document.getElementById('classroom-coursework-list').querySelectorAll('li.classroom-card')];
    const card = cards.find(li => li.textContent.includes('Lecture'));
    return {
        title: card.querySelector('.classroom-card-title').textContent,
        badge: card.querySelector('.classroom-badge').textContent,
        badgeIsWork: card.querySelector('.classroom-badge').classList.contains('classroom-badge-work'),
        dateLine: card.querySelector('.classroom-item-sub').textContent,
        description: card.querySelector('.classroom-card-desc').textContent,
        attachmentCount: card.querySelectorAll('li.classroom-attachment').length,
        attachmentText: card.querySelector('li.classroom-attachment').textContent,
    };
})()''')
assert 'Lecture' in work_card['title'], work_card
assert work_card['badge'] == 'Assignment', work_card
assert work_card['badgeIsWork'], work_card
assert 'Due' in work_card['dateLine'] and '2026' in work_card['dateLine'], work_card
assert 'chapitre 1' in work_card['description'], work_card
assert work_card['attachmentCount'] == 1, work_card
assert 'extrait.pdf' in work_card['attachmentText'], work_card
print('PASS assignment card shows title, "Assignment" type, due date, description and attachment together', flush=True)

# ---- 5. A material card (no due date) shows "Published" instead -----------
material_card = js('''(()=>{
    const cards = [...document.getElementById('classroom-coursework-list').querySelectorAll('li.classroom-card')];
    const card = cards.find(li => li.textContent.includes('Notes de cours'));
    return {
        badge: card.querySelector('.classroom-badge').textContent,
        badgeIsMaterial: card.querySelector('.classroom-badge').classList.contains('classroom-badge-material'),
        dateLine: card.querySelector('.classroom-item-sub').textContent,
        description: card.querySelector('.classroom-card-desc').textContent,
    };
})()''')
assert material_card['badge'] == 'Material', material_card
assert material_card['badgeIsMaterial'], material_card
assert 'Published' in material_card['dateLine'] and '2026' in material_card['dateLine'], material_card
assert 'vocabulaire' in material_card['description'], material_card
print('PASS material card shows "Material" type and a published (not due) date', flush=True)

# ---- 6. A card without a description simply omits that line (compact, no
# empty placeholder clutter) --------------------------------------------------
check('a card with no description has no .classroom-card-desc element', '''(()=>{
    const cards = [...document.getElementById('classroom-coursework-list').querySelectorAll('li.classroom-card')];
    const card = cards.find(li => li.textContent.includes('Vocabulaire'));
    return !card.querySelector('.classroom-card-desc');
})()''')

# ---- 7. Opening the assignment's PDF attachment directly from its card ----
open_result = js('''(async()=>{
    const cards = [...document.getElementById('classroom-coursework-list').querySelectorAll('li.classroom-card')];
    const card = cards.find(li => li.textContent.includes('Lecture'));
    card.querySelector('li.classroom-attachment').click();
    await new Promise(r => setTimeout(r, 400));
    return { modalClosed: document.getElementById('classroom-modal').style.display !== 'flex',
             format: state.format, bookKey: state.bookKey,
             calls: window.__calls.map(c => c.url) };
})()''')
assert open_result['modalClosed'], open_result
assert open_result['format'] == 'pdf', open_result
assert any('drive-pdf-1' in u and 'alt=media' in u for u in open_result['calls']), open_result
assert any('drive-pdf-1' in u and 'supportsAllDrives=true' in u for u in open_result['calls']), "Missing supportsAllDrives=true for Shared Drive support"
assert all('key=' not in u and 'AIza' not in u for u in open_result['calls']), open_result
print('PASS opening an attachment from its card keeps the existing behavior (state.format==="pdf") and uses supportsAllDrives', flush=True)

# Give PDF.js a moment to actually render before checking the page content —
# same pattern as the other PDF-focused suites.
c.wait("document.querySelector('.pdf-text-layer') && document.querySelector('.pdf-text-layer').textContent.trim().length>0", timeout=15)
check('opened PDF actually renders text (formatting/layout pipeline untouched)',
      "document.querySelector('.pdf-text-layer').textContent.includes('Hello world')")

# ---- 8. Existing Reader UX still works on Classroom-opened content ---------
check('language detection still works on the opened content', "detectLang('Hello world. PDF page 1.').startsWith('en')")

# ---- 9. A native Google Doc attachment is exported (not fetched as alt=media) ----
export_result = js('''(async()=>{
    window.__calls = [];
    document.getElementById('btn-classroom').click();
    await new Promise(r => setTimeout(r, 30));
    document.getElementById('classroom-courses-list').querySelector('li').click();
    await new Promise(r => setTimeout(r, 30));
    const cards = [...document.getElementById('classroom-coursework-list').querySelectorAll('li.classroom-card')];
    const card = cards.find(li => li.textContent.includes('Notes de cours'));
    card.querySelector('li.classroom-attachment').click();
    await new Promise(r => setTimeout(r, 400));
    return { format: state.format, bookKeyEndsPdf: (state.bookKey || '').includes('.pdf'), calls: window.__calls.map(c => c.url) };
})()''')
assert export_result['format'] == 'pdf', export_result
assert export_result['bookKeyEndsPdf'], export_result
assert any('drive-doc-1' in u and '/export' in u and 'mimeType=application' in u for u in export_result['calls']), export_result
assert not any('drive-doc-1' in u and 'alt=media' in u for u in export_result['calls']), export_result
print('PASS native Google Doc attachment is exported to PDF (not fetched as-is) and opens without formatting loss', flush=True)

# ---- 10. An already-supported plain-text attachment is fetched directly ----
txt_result = js('''(async()=>{
    window.__calls = [];
    document.getElementById('btn-classroom').click();
    await new Promise(r => setTimeout(r, 30));
    document.getElementById('classroom-courses-list').querySelector('li').click();
    await new Promise(r => setTimeout(r, 30));
    const cards = [...document.getElementById('classroom-coursework-list').querySelectorAll('li.classroom-card')];
    const card = cards.find(li => li.textContent.includes('Vocabulaire'));
    card.querySelector('li.classroom-attachment').click();
    await new Promise(r => setTimeout(r, 300));
    return { format: state.format, pagesText: els.pages.textContent, calls: window.__calls.map(c => c.url) };
})()''')
assert txt_result['format'] == 'txt', txt_result
assert 'Bonjour le monde' in txt_result['pagesText'], txt_result
assert any('drive-txt-1' in u and 'alt=media' in u for u in txt_result['calls']), txt_result
print('PASS plain-text attachment fetched via alt=media (no export) and opens as txt', flush=True)

# ---- 11. The non-Drive link material is shown nowhere as an "attachment" ---
link_check = js('''(async()=>{
    document.getElementById('btn-classroom').click();
    await new Promise(r => setTimeout(r, 30));
    document.getElementById('classroom-courses-list').querySelector('li').click();
    await new Promise(r => setTimeout(r, 30));
    const cards = [...document.getElementById('classroom-coursework-list').querySelectorAll('li.classroom-card')];
    const card = cards.find(li => li.textContent.includes('Notes de cours'));
    return card.querySelectorAll('li.classroom-attachment').length;
})()''')
assert link_check == 1, link_check  # only the driveFile material, not the link
print('PASS non-Drive materials (links/videos/forms) are filtered out of the attachment list', flush=True)

# ---- 12. Sign out clears the token and returns to the sign-in view --------
signout_result = js('''(async()=>{
    document.getElementById('classroom-signout-btn').click();
    return { shown: document.getElementById('classroom-view-signin').style.display !== 'none', revoked: window.__revoked === 'fake-token' };
})()''')
assert signout_result['shown'] and signout_result['revoked'], signout_result
print('PASS sign-out revokes the token and returns to the sign-in view', flush=True)

check('closing the modal leaves the Android-Back overlay stack', "(document.getElementById('classroom-close-btn').click(), topOpenOverlay() !== 'classroom')")
check('no application errors', '__errors.length===0 || JSON.stringify(__errors)')

print('ALL GOOGLE CLASSROOM CHECKS PASSED')
