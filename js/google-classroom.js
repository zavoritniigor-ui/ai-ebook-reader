/* google-classroom.js — вхід через Google + Classroom/Drive: курс → завдання й
 * матеріали → прикріплений файл → напряму в Reader, без ручного завантаження.
 *
 * Мінімальні дозволи (навмисно, не "все, що дозволено"): лише READ-ONLY
 * Classroom-scope'и для студентського потоку (власні курси, власні завдання,
 * матеріали курсу — без здачі робіт, оцінок чи редагування; без вчительського
 * scope на ЧУЖІ роботи, який тут нікому не потрібен) і drive.file — вужчий за
 * drive.readonly, НЕ дає доступу до всього Google Диска користувача. Див.
 * GOOGLE_SCOPES і коментар біля openDriveFile() щодо того, чому саме ці scope
 * і що робити, якщо drive.file виявиться замалим на реальному акаунті.
 *
 * Класичний <script src>, НЕ ES-модуль — див. js/core.js. Завантажується
 * одразу після js/main.js: викликає його openBookFile() (той самий вхід, що
 * й ручне завантаження файла), а сам ніколи не викликається з жодного
 * top-level коду інших файлів — лише з onclick тут-таки, тому порядок
 * насправді не критичний (див. "Deferred references" в ARCHITECTURE.md), але
 * логічне місце — остання "фіча" перед pwa-lifecycle.js, який має лишатись
 * останнім.
 */

// OAuth 2.0 Client ID (тип Web application) з Google Cloud Console → APIs &
// Services → Credentials. Це НЕ секрет — Client ID призначений саме для
// клієнтського коду; безпека тримається на "Authorized JavaScript origins" у
// консолі (ai-ebook-reader.pages.dev, localhost для розробки), а не на
// прихованості цього рядка. OAuth consent screen: External + Testing (доступ
// лише для акаунтів, явно доданих як test users в консолі).
const GOOGLE_CLIENT_ID =  '1057119342659-vu464ei1v7ophbcuufbe8muhd9nb3fng.apps.googleusercontent.com';

// Мінімальний набір дозволів: лише читання курсів і завдань/матеріалів (жодного
// запису, здачі робіт, оцінок чи коментарів), плюс drive.file замість
// drive.readonly. За задумом Google, drive.file відкриває доступ саме до
// файлів, з якими застосунок уже працював у цій сесії — а ідентифікатор
// файла ми отримуємо через саму Classroom API, а не вгадуємо чи скануємо
// весь Диск.
//
// БЕЗ classroom.coursework.students.readonly: цей scope відкриває вчительський
// перегляд ЧУЖИХ (студентських) робіт у курсах, де користувач викладає, — для
// суто студентського read-only потоку (переглянути СВОЇ курси/завдання) він не
// потрібен, тож не запитуємо його, аби consent-екран лишався якомога коротшим.
// Якщо застосунок колись знадобиться й викладачам для перегляду студентських
// робіт (не просто матеріалів курсу — ті вже покриті courseworkmaterials
// нижче), цей scope треба буде повернути.
//
// Це ЄДИНЕ місце, яке варто змінити, якщо на реальному шкільному акаунті
// виявиться, що конкретне вкладення не відкривається під drive.file (Google
// десь вимагає, щоб файл був явно "відкритий" через Picker, а не лише
// знайдений через іншу API) — тоді додайте
// 'https://www.googleapis.com/auth/drive.readonly' замість 'drive.file'. НЕ
// робіть цю заміну заздалегідь "про всяк випадок" — лише якщо реальний тест
// відкриття вкладення справді впаде з 403 і буде показано, що причина саме в
// drive.file.
const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
    'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
    'https://www.googleapis.com/auth/drive.file'
].join(' ');

const classroomModal = document.getElementById('classroom-modal');
const classroomViews = {
    signin: document.getElementById('classroom-view-signin'),
    loading: document.getElementById('classroom-view-loading'),
    error: document.getElementById('classroom-view-error'),
    courses: document.getElementById('classroom-view-courses'),
    coursework: document.getElementById('classroom-view-coursework'),
    attachments: document.getElementById('classroom-view-attachments')
};
const classroomBackBtn = document.getElementById('classroom-back-btn');
const classroomSignOutBtn = document.getElementById('classroom-signout-btn');

// Стан ВИКЛЮЧНО цього модуля — інші файли його не читають, так само як
// dictation.js тримає власний об'єкт `dictation`, а не пише в спільний `state`.
const googleAuth = { token: null, expiresAt: 0, tokenClient: null };
// Стек навігації (лише для кнопки "Назад"): кожен запис — з якого view й
// (де потрібно) для якого курсу ми сюди прийшли.
let classroomStack = [];
let classroomCurrentCourse = null;

function isGoogleSignedIn() { return !!googleAuth.token && Date.now() < googleAuth.expiresAt; }

function showClassroomView(name, opts = {}) {
    for (const key in classroomViews) classroomViews[key].style.display = key === name ? '' : 'none';
    classroomBackBtn.style.display = opts.showBack ? '' : 'none';
    classroomSignOutBtn.style.display = isGoogleSignedIn() && name !== 'signin' ? '' : 'none';
}
function classroomError(message) {
    document.getElementById('classroom-error-text').textContent = message;
    showClassroomView('error', { showBack: classroomStack.length > 0 });
}

function openClassroomModal() {
    classroomModal.style.display = 'flex';
    classroomStack = []; classroomCurrentCourse = null;
    if (isGoogleSignedIn()) loadCourses(); else showClassroomView('signin');
}
function closeClassroomModal() { classroomModal.style.display = 'none'; }
// Один крок назад у навігації курс → завдання → вкладення; на найвищому рівні
// (список курсів, стек порожній) — закриває всю модалку. Викликається і з
// кнопки "Назад" тут-таки, і з апаратної/жестової Android Back через
// js/pwa-lifecycle.js (OVERLAY_LAYERS) — той самий крок в обох випадках.
function classroomGoBackOrClose() {
    const prev = classroomStack.pop();
    // Порожній стек — ми вже на найвищому рівні (список курсів або вхід):
    // нікуди повертатись, тож "Назад" закриває всю модалку.
    if (!prev) { closeClassroomModal(); return; }
    if (prev.view === 'courses') { loadCourses(); return; }
    if (prev.view === 'coursework') { classroomCurrentCourse = prev.course; loadCourseWork(prev.course); }
}
document.getElementById('btn-classroom').onclick = openClassroomModal;
document.getElementById('classroom-close-btn').onclick = closeClassroomModal;
document.getElementById('classroom-signin-btn').onclick = googleSignIn;
classroomSignOutBtn.onclick = googleSignOut;
classroomBackBtn.onclick = classroomGoBackOrClose;

// ===== ВХІД ЧЕРЕЗ GOOGLE (Google Identity Services, popup token-флоу — без
// власного бекенда й без редіректу) =====
function ensureTokenClient() {
    if (googleAuth.tokenClient) return googleAuth.tokenClient;
    if (!window.google?.accounts?.oauth2) return null;
    googleAuth.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: (resp) => {
            if (resp.error) { classroomError(t('classroomAuthError')); return; }
            googleAuth.token = resp.access_token;
            // expires_in — секунди від Google; віднімаємо хвилину як запас, щоб
            // не впертися в токен, що спливає рівно в момент наступного запиту.
            googleAuth.expiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000 - 60000;
            loadCourses();
        }
    });
    return googleAuth.tokenClient;
}
function googleSignIn() {
    const client = ensureTokenClient();
    if (!client) { classroomError(t('classroomAuthError')); return; }
    showClassroomView('loading');
    client.requestAccessToken({ prompt: isGoogleSignedIn() ? '' : 'consent' });
}
function googleSignOut() {
    if (googleAuth.token && window.google?.accounts?.oauth2) {
        try { google.accounts.oauth2.revoke(googleAuth.token, () => {}); } catch (e) {}
    }
    googleAuth.token = null; googleAuth.expiresAt = 0;
    classroomStack = []; classroomCurrentCourse = null;
    showClassroomView('signin');
}

// ===== CLASSROOM / DRIVE (REST, лише GET) =====
async function googleApiFetch(url, timeoutMs = 45000) {
    const res = await fetchWithTimeout(url, { headers: { Authorization: 'Bearer ' + googleAuth.token } }, timeoutMs);
    if (res.status === 401) { googleAuth.token = null; googleAuth.expiresAt = 0; throw new Error(t('classroomAuthError')); }
    if (!res.ok) throw new Error('Google API ' + res.status);
    return res;
}
async function loadCourses() {
    showClassroomView('loading', { showBack: false });
    try {
        let courses = [], pageToken = '';
        do {
            const url = 'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=100' +
                (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
            const data = await (await googleApiFetch(url)).json();
            courses = courses.concat(data.courses || []);
            pageToken = data.nextPageToken || '';
        } while (pageToken && courses.length < 500);
        renderCourses(courses);
    } catch (err) { classroomError(err.message || t('classroomAuthError')); }
}
function renderCourses(courses) {
    const list = document.getElementById('classroom-courses-list');
    list.innerHTML = '';
    if (!courses.length) { list.innerHTML = `<li class="classroom-empty">${escapeHtml(t('classroomNoCourses'))}</li>`; showClassroomView('courses', { showBack: false }); return; }
    for (const course of courses) {
        const li = document.createElement('li');
        li.textContent = course.name || course.id;
        if (course.section) { const sub = document.createElement('div'); sub.className = 'classroom-item-sub'; sub.textContent = course.section; li.appendChild(sub); }
        li.onclick = () => {
            classroomStack.push({ view: 'courses' });
            classroomCurrentCourse = { id: course.id, name: course.name };
            loadCourseWork(classroomCurrentCourse);
        };
        list.appendChild(li);
    }
    showClassroomView('courses', { showBack: false });
}
async function loadCourseWork(course) {
    showClassroomView('loading', { showBack: true });
    try {
        const [workData, materialData] = await Promise.all([
            googleApiFetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?pageSize=100`).then(r => r.json()).catch(() => ({})),
            googleApiFetch(`https://classroom.googleapis.com/v1/courses/${course.id}/courseWorkMaterials?pageSize=100`).then(r => r.json()).catch(() => ({}))
        ]);
        // Google API повертає ключ в однині для courseWorkMaterials — тримаємо
        // обидва варіанти на випадок майбутньої зміни.
        const materials = materialData.courseWorkMaterial || materialData.courseWorkMaterials || [];
        const items = [
            ...(workData.courseWork || []).map(w => Object.assign({ kind: 'courseWork' }, w)),
            ...materials.map(m => Object.assign({ kind: 'courseWorkMaterial' }, m))
        ];
        items.sort((a, b) => new Date(b.updateTime || b.creationTime || 0) - new Date(a.updateTime || a.creationTime || 0));
        renderCourseWork(items);
    } catch (err) { classroomError(err.message || t('classroomAuthError')); }
}
// Матеріали, прикріплені до завдання/допису: filtruємо лише файли Drive —
// посилання/відео/форми Reader відкрити не може, тому їх просто не показуємо.
function extractDriveAttachments(item) {
    const materials = item.materials || [];
    return materials.filter(m => m.driveFile && m.driveFile.driveFile).map(m => ({
        id: m.driveFile.driveFile.id,
        title: m.driveFile.driveFile.title || item.title || ''
    }));
}
function renderCourseWork(items) {
    const list = document.getElementById('classroom-coursework-list');
    list.innerHTML = '';
    if (!items.length) { list.innerHTML = `<li class="classroom-empty">${escapeHtml(t('classroomNoWork'))}</li>`; showClassroomView('coursework', { showBack: true }); return; }
    for (const item of items) {
        const li = document.createElement('li');
        li.textContent = item.title || '—';
        const count = extractDriveAttachments(item).length;
        if (count) {
            const sub = document.createElement('div'); sub.className = 'classroom-item-sub';
            sub.textContent = `📎 ${count} ${t('classroomAttachmentsCount')}`;
            li.appendChild(sub);
        }
        li.onclick = () => {
            classroomStack.push({ view: 'coursework', course: classroomCurrentCourse });
            renderAttachments(item);
        };
        list.appendChild(li);
    }
    showClassroomView('coursework', { showBack: true });
}
function renderAttachments(item) {
    const list = document.getElementById('classroom-attachments-list');
    list.innerHTML = '';
    const attachments = extractDriveAttachments(item);
    if (!attachments.length) { list.innerHTML = `<li class="classroom-empty">${escapeHtml(t('classroomNoAttachments'))}</li>`; showClassroomView('attachments', { showBack: true }); return; }
    for (const att of attachments) {
        const li = document.createElement('li');
        li.textContent = '📄 ' + att.title;
        li.onclick = () => openDriveFile(att.id, att.title);
        list.appendChild(li);
    }
    showClassroomView('attachments', { showBack: true });
}

// ===== ВІДКРИТТЯ ФАЙЛА DRIVE НАПРЯМУ В READER =====
// Формати, які Reader уже вміє відкривати БЕЗ конвертації — той самий перелік,
// що й для ручного завантаження (js/main.js), лише звірений за mimeType
// замість розширення файла.
const DRIVE_DIRECT_MIME = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/epub+zip': 'epub',
    'text/plain': 'txt',
    'text/html': 'html',
    'application/rtf': 'rtf',
    'text/rtf': 'rtf'
};
// Власні формати Google Docs/Slides не існують як файл на диску — їх треба
// ЕКСПОРТУВАТИ. PDF — найточніший спосіб не втратити оформлення: рендериться
// так само, посторінково, як і будь-який інший PDF, без жодного reflow.
const DRIVE_EXPORT_MIME = {
    'application/vnd.google-apps.document': 'application/pdf',
    'application/vnd.google-apps.presentation': 'application/pdf'
};
async function openDriveFile(fileId, suggestedTitle) {
    showClassroomView('loading', { showBack: true });
    try {
        const meta = await (await googleApiFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`)).json();
        const name = meta.name || suggestedTitle || 'document';
        let blob, ext;
        if (DRIVE_EXPORT_MIME[meta.mimeType]) {
            const exportMime = DRIVE_EXPORT_MIME[meta.mimeType];
            blob = await (await googleApiFetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportMime)}`, 60000)).blob();
            ext = 'pdf';
        } else if (DRIVE_DIRECT_MIME[meta.mimeType]) {
            blob = await (await googleApiFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, 60000)).blob();
            ext = DRIVE_DIRECT_MIME[meta.mimeType];
        } else {
            throw new Error(t('unsupportedFormat'));
        }
        const fileName = name.toLowerCase().endsWith('.' + ext) ? name : name + '.' + ext;
        const file = new File([blob], fileName, { type: blob.type });
        closeClassroomModal();
        await openBookFile(file);
    } catch (err) {
        classroomError(err.message || t('classroomOpenError'));
    }
}
