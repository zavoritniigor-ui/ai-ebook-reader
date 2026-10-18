/* «Зберегти на Google Диск»: книга з бібліотеки (той самий файл, що «⬇ Зберегти») і знімок фрагмента сторінки (Save PNG)
 * лягають у теку «AI Ebook Reader» на Диску людини. Вхід іде через вікно Google (Google Identity Services): пароля Google
 * застосунок не бачить, токен доступу живе лише в пам’яті сторінки, а дозвіл drive.file дає доступ тільки до файлів,
 * які створив сам застосунок. Скрипт Google вантажиться лише після натискання кнопки, тож читання книги до Google не
 * звертається. GOOGLE_DRIVE_CLIENT_ID — публічний ідентифікатор OAuth-клієнта (не секрет); поки він порожній, кнопок немає.
 * Налаштування — розділ «Google Drive» у HANDOFF.md. */
const GOOGLE_DRIVE_CLIENT_ID = '';
const GDRIVE_API = 'https://www.googleapis.com';
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file', GDRIVE_FOLDER = 'AI Ebook Reader';
const GDRIVE_MULTIPART_MAX = 5 * 1024 * 1024;   // Drive: до 5 МБ — одним запитом (multipart), більші — resumable
let gdriveClient = null, gdriveWaiter = null, gdriveToken = null, gdriveTokenUntil = 0, gdriveFolderId = null, gdriveScript = null;
Object.assign(I18N, {
    libDrive: { uk: '☁ Google Диск', en: '☁ Google Drive', fr: '☁ Google Drive', ru: '☁ Google Диск', es: '☁ Google Drive' },
    libDriveTitle: { uk: 'Зберегти книгу на ваш Google Диск (тека «AI Ebook Reader»)', en: 'Save the book to your Google Drive (folder “AI Ebook Reader”)',
                     fr: 'Enregistrer le livre sur votre Google Drive (dossier « AI Ebook Reader »)', ru: 'Сохранить книгу на ваш Google Диск (папка «AI Ebook Reader»)',
                     es: 'Guardar el libro en tu Google Drive (carpeta «AI Ebook Reader»)' },
    driveSignIn: { uk: 'Вхід у Google…', en: 'Signing in to Google…', fr: 'Connexion à Google…', ru: 'Вход в Google…', es: 'Iniciando sesión en Google…' },
    driveSaving: { uk: 'Збереження на Google Диск…', en: 'Saving to Google Drive…', fr: 'Enregistrement sur Google Drive…', ru: 'Сохранение на Google Диск…', es: 'Guardando en Google Drive…' },
    driveSaved: { uk: 'Збережено на Google Диску: {name}', en: 'Saved to Google Drive: {name}', fr: 'Enregistré sur Google Drive : {name}', ru: 'Сохранено на Google Диск: {name}', es: 'Guardado en Google Drive: {name}' },
    driveCancelled: { uk: 'Вхід у Google скасовано.', en: 'Google sign-in was cancelled.', fr: 'Connexion à Google annulée.', ru: 'Вход в Google отменён.', es: 'Inicio de sesión en Google cancelado.' },
    driveBlocked: { uk: 'Браузер заблокував вікно входу в Google. Дозвольте спливаючі вікна для цього сайту й натисніть ще раз.',
                    en: 'The browser blocked the Google sign-in window. Allow pop-ups for this site and press the button again.',
                    fr: 'Le navigateur a bloqué la fenêtre de connexion Google. Autorisez les fenêtres pop-up pour ce site et réessayez.',
                    ru: 'Браузер заблокировал окно входа в Google. Разрешите всплывающие окна для этого сайта и нажмите ещё раз.',
                    es: 'El navegador bloqueó la ventana de inicio de sesión de Google. Permite las ventanas emergentes para este sitio y vuelve a pulsar.' },
    driveAuth: { uk: 'Сеанс Google завершився. Натисніть кнопку ще раз.', en: 'The Google session has ended. Press the button again.',
                 fr: 'La session Google a pris fin. Appuyez de nouveau sur le bouton.', ru: 'Сеанс Google завершился. Нажмите кнопку ещё раз.', es: 'La sesión de Google terminó. Pulsa el botón otra vez.' },
    driveForbidden: { uk: 'Google Диск не прийняв файл: можливо, немає місця або не надано доступ.',
                      en: 'Google Drive did not accept the file: it may be out of space, or access was not granted.',
                      fr: 'Google Drive n’a pas accepté le fichier : espace insuffisant ou accès non accordé.',
                      ru: 'Google Диск не принял файл: возможно, нет места или не дан доступ.', es: 'Google Drive no aceptó el archivo: puede que no haya espacio o no se concedió acceso.' },
    driveNetwork: { uk: 'Немає зв’язку з Google. Перевірте інтернет і спробуйте ще раз.', en: 'No connection to Google. Check your internet and try again.',
                    fr: 'Pas de connexion à Google. Vérifiez votre connexion et réessayez.', ru: 'Нет связи с Google. Проверьте интернет и попробуйте ещё раз.',
                    es: 'Sin conexión con Google. Revisa tu internet e inténtalo de nuevo.' },
    driveScript: { uk: 'Не вдалося завантажити вхід у Google. Перевірте інтернет.', en: 'Could not load Google sign-in. Check your internet.',
                   fr: 'Impossible de charger la connexion Google. Vérifiez votre connexion.', ru: 'Не удалось загрузить вход в Google. Проверьте интернет.',
                   es: 'No se pudo cargar el inicio de sesión de Google. Revisa tu internet.' },
    driveFailed: { uk: 'Не вдалося зберегти на Google Диск. Спробуйте ще раз.', en: 'Could not save to Google Drive. Try again.',
                   fr: 'Impossible d’enregistrer sur Google Drive. Réessayez.', ru: 'Не удалось сохранить на Google Диск. Попробуйте ещё раз.',
                   es: 'No se pudo guardar en Google Drive. Inténtalo de nuevo.' }
});

const driveConfigured = () => /^[\w-]+\.apps\.googleusercontent\.com$/.test(GOOGLE_DRIVE_CLIENT_ID);
const gdriveReady = () => !!(window.google && google.accounts && google.accounts.oauth2);
function driveError(reason, status) { const e = new Error(reason); e.driveReason = reason; if (status) e.status = status; return e; }
// Текст для людини з типізованої помилки.
function driveMessage(err) {
    const key = { popup: 'driveBlocked', cancelled: 'driveCancelled', auth: 'driveAuth', forbidden: 'driveForbidden', network: 'driveNetwork', script: 'driveScript' }[err && err.driveReason];
    return t(key || 'driveFailed');
}

// Скрипт Google — лише тоді, коли він потрібен, і один раз за сеанс.
function loadGoogleIdentity() {
    if (gdriveReady()) return Promise.resolve();
    if (!gdriveScript) gdriveScript = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        const fail = () => { gdriveScript = null; s.remove(); reject(driveError('script')); };
        s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
        s.onload = () => (gdriveReady() ? resolve() : fail());
        s.onerror = fail;
        document.head.append(s);
    });
    return gdriveScript;
}
// Токен живе годину і тримається лише в пам’яті сторінки. Вікно входу браузер дозволяє відкрити лише з натискання,
// тому токен просимо першим — ще до читання книги.
async function driveToken() {
    if (gdriveToken && Date.now() < gdriveTokenUntil) return gdriveToken;
    await loadGoogleIdentity();
    if (!gdriveClient) gdriveClient = google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_DRIVE_CLIENT_ID, scope: GDRIVE_SCOPE,
        callback: onDriveToken, error_callback: onDriveTokenError });
    if (gdriveWaiter) gdriveWaiter.reject(driveError('cancelled'));
    return new Promise((resolve, reject) => { gdriveWaiter = { resolve, reject }; gdriveClient.requestAccessToken({ prompt: '' }); });
}
function onDriveToken(resp) {
    const w = gdriveWaiter; gdriveWaiter = null;
    if (resp.error) { if (w) w.reject(driveError(resp.error === 'access_denied' ? 'cancelled' : 'auth')); return; }
    gdriveToken = resp.access_token; gdriveTokenUntil = Date.now() + (Number(resp.expires_in) || 3600) * 1000 - 60000;
    gdriveFolderId = null;   // інший обліковий запис має свою теку
    if (w) w.resolve(gdriveToken);
}
function onDriveTokenError(err) {
    const w = gdriveWaiter; gdriveWaiter = null;
    const reason = err && err.type === 'popup_failed_to_open' ? 'popup' : err && err.type === 'popup_closed' ? 'cancelled' : 'auth';
    if (w) w.reject(driveError(reason));
}

// Відповідь Google з помилкою → типізована причина. 401: сеанс минув, токен забуваємо — наступне натискання попросить вхід.
function driveHttpError(status) {
    if (status === 401) gdriveToken = null;
    return driveError(status === 401 ? 'auth' : status === 403 ? 'forbidden' : 'server', status);
}
async function driveFetch(url, token, options = {}) {
    let res;
    try { res = await fetch(url, { ...options, headers: { Authorization: 'Bearer ' + token, ...options.headers } }); }
    catch (e) { throw driveError('network'); }
    if (!res.ok) throw driveHttpError(res.status);
    return res;
}
// Запит із прогресом: fetch не показує, скільки байтів уже відправлено.
function driveSend(method, url, body, headers, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url);
        for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
        xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) return reject(driveHttpError(xhr.status));
            try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(driveError('server')); }
        };
        xhr.onerror = () => reject(driveError('network'));
        xhr.send(body);
    });
}

// Тека «AI Ebook Reader»: шукаємо серед файлів, які створив цей застосунок (drive.file), інакше створюємо.
async function driveFolder(token) {
    if (gdriveFolderId) return gdriveFolderId;
    const q = `name = '${GDRIVE_FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const found = await (await driveFetch(`${GDRIVE_API}/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`, token)).json();
    if (found.files && found.files.length) return (gdriveFolderId = found.files[0].id);
    const made = await (await driveFetch(`${GDRIVE_API}/drive/v3/files?fields=id`, token, {
        method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({ name: GDRIVE_FOLDER, mimeType: 'application/vnd.google-apps.folder' }) })).json();
    return (gdriveFolderId = made.id);
}
// Файл у теку. Великий файл: спершу сесія resumable (Location), потім самі байти.
async function driveUpload(file, folderId, token, onProgress) {
    const mime = file.type || 'application/octet-stream';
    if (file.size <= GDRIVE_MULTIPART_MAX) {
        const boundary = 'ebookreader' + Math.random().toString(36).slice(2);
        const body = new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
            JSON.stringify({ name: file.name, parents: [folderId] }), `\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`, file, `\r\n--${boundary}--`]);
        return driveSend('POST', `${GDRIVE_API}/upload/drive/v3/files?uploadType=multipart&fields=id,name`, body,
            { Authorization: 'Bearer ' + token, 'Content-Type': `multipart/related; boundary=${boundary}` }, onProgress);
    }
    let start;
    try {
        start = await driveFetch(`${GDRIVE_API}/upload/drive/v3/files?uploadType=resumable`, token, {
            method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(file.size) },
            body: JSON.stringify({ name: file.name, parents: [folderId] }) });
    } catch (e) { if (e.status === 404) gdriveFolderId = null; throw e; }   // теку видалили в Диску — наступного разу створимо нову
    const session = start.headers.get('Location');
    if (!session) throw driveError('server');
    return driveSend('PUT', session, file, { 'Content-Type': mime }, onProgress);
}

// Зберігає файл у теку на Диску. `getFile` повертає сам файл (книга з бібліотеки — після завантаження), `setStatus` —
// текст для людини. Повертає {id, name}; помилки мають `driveReason` (див. driveMessage).
async function saveFileToDrive(getFile, setStatus) {
    setStatus(t('driveSignIn'));
    const token = await driveToken();
    setStatus(t('libLoading'));
    const file = await getFile();
    setStatus(t('driveSaving'));
    const folderId = await driveFolder(token);
    return driveUpload(file, folderId, token, p => setStatus(t('driveSaving') + ' ' + Math.round(p * 100) + '%'));
}
