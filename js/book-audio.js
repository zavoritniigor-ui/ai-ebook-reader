/* book-audio.js — the audio that comes with a book ("Par ici": «CD1 - piste 33»): tap the mark in the PDF, hear the track.
 *
 * The learner points the app at the folder (or the files) with the book's audio ONCE on a device; the tracks are kept on THAT device
 * (IndexedDB, one record per track with the audio Blob inside), so it works offline and on any device that has the files. Nothing
 * is uploaded and nothing is shared between devices.
 *
 *  - file names -> (CD, track): «01 Track 01.m4a» in a folder «A1 CD1», «01 Track 01 1.m4a» in «A1 CD2» (the second disc's copy of a
 *    track number), «CD2 - 05.mp3», «Piste 12.mp3»... (baParseFile / baAssignDiscs; a plain file picker has no folder names, so a track
 *    number that occurs twice is split into discs by the copy suffix).
 *  - marks in the book: every PDF page's text items are scanned for «CD2 - piste 35» (also split over several items); each mark gets a
 *    button over its printed text (.pdf-audio-marker, in a .pdf-audio-layer built with the page like the link layer) -- tapping it plays.
 *  - one player (#audio-player: play / pause, position, speed, close), one dialog (#book-audio-dialog: choose folder / files, status,
 *    remove). Starting a track stops read-aloud; starting read-aloud pauses the track (tts.js startUtterance).
 *
 * Classic <script src>, not an ES module -- see js/core.js. Called from: js/pdf-render.js (buildPdfAudioLayer), js/main.js
 * (onBookAudioBookChanged), js/tts.js (pauseBookAudio), js/core.js applyI18n (syncAudioMenuRow), js/pwa-lifecycle.js (Back closes the dialog).
 */
Object.assign(I18N, {
    mAudio: { uk: 'Аудіо до книги', en: 'Book audio', fr: 'Audio du livre', ru: 'Аудио к книге', es: 'Audio del libro', zh: '书籍音频', ko: '책 오디오', hi: 'पुस्तक का ऑडियो', ga: 'Fuaim an leabhair' },
    mAudioDesc: { uk: 'Папка з доріжками: тап на «piste» у книзі вмикає запис', en: 'Audio folder: tap a «piste» mark in the book to play it',
                  fr: 'Dossier audio : touchez une mention « piste » du livre pour écouter', ru: 'Папка с дорожками: тап по «piste» в книге включает запись',
                  es: 'Carpeta de audio: toca una marca «piste» del libro para escucharla', zh: '音频文件夹：点按书中的“piste”标记即可播放', ko: '오디오 폴더: 책의 “piste” 표시를 누르면 재생됩니다',
                  hi: 'ऑडियो फ़ोल्डर: किताब में “piste” पर टैप करें और सुनें', ga: 'Fillteán fuaime: tapáil marc «piste» sa leabhar chun éisteacht' },
    baNone: { uk: 'До цієї книги ще не підключено аудіо.', en: 'No audio is connected to this book yet.', fr: 'Aucun audio n’est encore relié à ce livre.', ru: 'К этой книге ещё не подключено аудио.',
              es: 'Todavía no hay audio conectado a este libro.', zh: '这本书还没有连接音频。', ko: '이 책에는 아직 오디오가 연결되지 않았습니다.', hi: 'इस किताब से अभी कोई ऑडियो जुड़ा नहीं है।', ga: 'Níl aon fhuaim ceangailte leis an leabhar seo go fóill.' },
    baCount: { uk: 'Підключено доріжок: {n}', en: 'Tracks connected: {n}', fr: 'Pistes reliées : {n}', ru: 'Подключено дорожек: {n}', es: 'Pistas conectadas: {n}',
               zh: '已连接的音轨：{n}', ko: '연결된 트랙: {n}', hi: 'जुड़े ट्रैक: {n}', ga: 'Rianta ceangailte: {n}' },
    baPickFolder: { uk: 'Вибрати папку з аудіо', en: 'Choose the audio folder', fr: 'Choisir le dossier audio', ru: 'Выбрать папку с аудио', es: 'Elegir la carpeta de audio',
                    zh: '选择音频文件夹', ko: '오디오 폴더 선택', hi: 'ऑडियो फ़ोल्डर चुनें', ga: 'Roghnaigh an fillteán fuaime' },
    baPickFiles: { uk: 'Вибрати файли', en: 'Choose files', fr: 'Choisir des fichiers', ru: 'Выбрать файлы', es: 'Elegir archivos', zh: '选择文件', ko: '파일 선택', hi: 'फ़ाइलें चुनें', ga: 'Roghnaigh comhaid' },
    baRemove: { uk: 'Видалити аудіо цієї книги', en: 'Remove this book’s audio', fr: 'Supprimer l’audio de ce livre', ru: 'Удалить аудио этой книги', es: 'Quitar el audio de este libro',
                zh: '删除这本书的音频', ko: '이 책의 오디오 삭제', hi: 'इस किताब का ऑडियो हटाएँ', ga: 'Bain fuaim an leabhair seo' },
    baNote: { uk: 'Файли зберігаються лише на цьому пристрої. На іншому пристрої вкажіть папку так само.', en: 'The files stay on this device only. On another device, choose the folder the same way.',
              fr: 'Les fichiers restent sur cet appareil. Sur un autre appareil, choisissez le dossier de la même façon.', ru: 'Файлы хранятся только на этом устройстве. На другом устройстве укажите папку так же.',
              es: 'Los archivos se quedan solo en este dispositivo. En otro dispositivo, elige la carpeta del mismo modo.', zh: '文件只保存在这台设备上。在其他设备上请用同样的方法选择文件夹。',
              ko: '파일은 이 기기에만 저장됩니다. 다른 기기에서도 같은 방법으로 폴더를 선택하세요.', hi: 'फ़ाइलें केवल इसी डिवाइस पर रहती हैं। दूसरे डिवाइस पर भी फ़ोल्डर इसी तरह चुनें।',
              ga: 'Fanann na comhaid ar an ngléas seo amháin. Ar ghléas eile, roghnaigh an fillteán ar an mbealach céanna.' },
    baSaving: { uk: 'Збереження {i} з {n}…', en: 'Saving {i} of {n}…', fr: 'Enregistrement {i} sur {n}…', ru: 'Сохранение {i} из {n}…', es: 'Guardando {i} de {n}…',
                zh: '正在保存 {i} / {n}…', ko: '저장 중 {i} / {n}…', hi: 'सहेजा जा रहा है {i} / {n}…', ga: 'Á shábháil {i} as {n}…' },
    baSaved: { uk: 'Збережено доріжок: {n}', en: 'Tracks saved: {n}', fr: 'Pistes enregistrées : {n}', ru: 'Сохранено дорожек: {n}', es: 'Pistas guardadas: {n}', zh: '已保存的音轨：{n}', ko: '저장된 트랙: {n}', hi: 'सहेजे गए ट्रैक: {n}', ga: 'Rianta sábháilte: {n}' },
    baNoFiles: { uk: 'У вибраному немає аудіофайлів.', en: 'There are no audio files in the selection.', fr: 'La sélection ne contient aucun fichier audio.', ru: 'В выбранном нет аудиофайлов.',
                 es: 'La selección no contiene archivos de audio.', zh: '所选内容中没有音频文件。', ko: '선택한 항목에 오디오 파일이 없습니다.', hi: 'चयन में कोई ऑडियो फ़ाइल नहीं है।', ga: 'Níl comhaid fuaime sa roghnúchán.' },
    baNoSpace: { uk: 'Недостатньо місця на пристрої.', en: 'Not enough space on the device.', fr: 'Pas assez d’espace sur l’appareil.', ru: 'Недостаточно места на устройстве.', es: 'No hay espacio suficiente en el dispositivo.',
                 zh: '设备空间不足。', ko: '기기에 공간이 부족합니다.', hi: 'डिवाइस में पर्याप्त जगह नहीं है।', ga: 'Níl go leor spáis ar an ngléas.' },
    baMissing: { uk: 'У вибраних файлах немає доріжки {label}.', en: 'There is no track {label} in the chosen files.', fr: 'Il n’y a pas de piste {label} dans les fichiers choisis.',
                 ru: 'В выбранных файлах нет дорожки {label}.', es: 'No hay una pista {label} en los archivos elegidos.', zh: '所选文件中没有音轨 {label}。', ko: '선택한 파일에 {label} 트랙이 없습니다.',
                 hi: 'चुनी गई फ़ाइलों में ट्रैक {label} नहीं है।', ga: 'Níl rian {label} sna comhaid roghnaithe.' },
    baAmbiguous: { uk: 'Не вдалося визначити, з якого диска ця доріжка ({label}).', en: 'Could not tell which disc this track is on ({label}).', fr: 'Impossible de savoir sur quel disque se trouve cette piste ({label}).',
                   ru: 'Не удалось определить, с какого диска эта дорожка ({label}).', es: 'No se pudo saber en qué disco está esta pista ({label}).', zh: '无法确定这个音轨在哪张光盘上（{label}）。',
                   ko: '이 트랙이 어느 디스크에 있는지 알 수 없습니다 ({label}).', hi: 'यह पता नहीं चला कि यह ट्रैक किस डिस्क पर है ({label})।', ga: 'Níorbh fhéidir a dhéanamh amach cén diosca a bhfuil an rian seo air ({label}).' },
    baConnect: { uk: 'Вкажіть папку з аудіо до цієї книги, щоб слухати записи.', en: 'Choose this book’s audio folder to listen to the recordings.', fr: 'Choisissez le dossier audio de ce livre pour écouter les enregistrements.',
                 ru: 'Укажите папку с аудио к этой книге, чтобы слушать записи.', es: 'Elige la carpeta de audio de este libro para escuchar las grabaciones.', zh: '请选择这本书的音频文件夹，以便收听录音。',
                 ko: '녹음을 들으려면 이 책의 오디오 폴더를 선택하세요.', hi: 'रिकॉर्डिंग सुनने के लिए इस किताब का ऑडियो फ़ोल्डर चुनें।', ga: 'Roghnaigh fillteán fuaime an leabhair seo chun éisteacht leis na taifid.' },
    baPlayMark: { uk: 'Слухати: {label}', en: 'Play: {label}', fr: 'Écouter : {label}', ru: 'Слушать: {label}', es: 'Escuchar: {label}', zh: '播放：{label}', ko: '재생: {label}', hi: 'चलाएँ: {label}', ga: 'Seinn: {label}' },
    baPlay: { uk: 'Відтворити', en: 'Play', fr: 'Lecture', ru: 'Воспроизвести', es: 'Reproducir', zh: '播放', ko: '재생', hi: 'चलाएँ', ga: 'Seinn' },
    baPause: { uk: 'Пауза', en: 'Pause', fr: 'Pause', ru: 'Пауза', es: 'Pausa', zh: '暂停', ko: '일시정지', hi: 'रोकें', ga: 'Cuir ar sos' },
    baSpeed: { uk: 'Швидкість', en: 'Speed', fr: 'Vitesse', ru: 'Скорость', es: 'Velocidad', zh: '速度', ko: '속도', hi: 'गति', ga: 'Luas' },
    baSeek: { uk: 'Позиція в записі', en: 'Position in the recording', fr: 'Position dans l’enregistrement', ru: 'Позиция в записи', es: 'Posición en la grabación', zh: '录音位置', ko: '녹음 위치', hi: 'रिकॉर्डिंग में स्थान', ga: 'Ionad sa taifead' },
    baClose: { uk: 'Закрити плеєр', en: 'Close the player', fr: 'Fermer le lecteur', ru: 'Закрыть плеер', es: 'Cerrar el reproductor', zh: '关闭播放器', ko: '플레이어 닫기', hi: 'प्लेयर बंद करें', ga: 'Dún an seinnteoir' },
    baError: { uk: 'Не вдалося відтворити цей файл.', en: 'This file could not be played.', fr: 'Ce fichier n’a pas pu être lu.', ru: 'Не удалось воспроизвести этот файл.', es: 'No se pudo reproducir este archivo.',
               zh: '无法播放此文件。', ko: '이 파일을 재생할 수 없습니다.', hi: 'यह फ़ाइल चलाई नहीं जा सकी।', ga: 'Níorbh fhéidir an comhad seo a sheinm.' },
});

// ---------- storage: IndexedDB, metadata in 'tracks' and Audio Blobs in 'blobs' ----------------------------------------------
const BA_DB = 'reader-book-audio', BA_STORE = 'tracks', BA_BLOB_STORE = 'blobs', BA_MAX_BYTES = 3 * 1024 * 1024 * 1024;
let baDbPromise = null;
function baDb() {
    if (!baDbPromise) baDbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
        const req = indexedDB.open(BA_DB, 3);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('speech')) {   // the narration of a book (js/book-speech.js)
                const speech = db.createObjectStore('speech', { keyPath: 'id' });
                speech.createIndex('book', 'bookKey');
            }
            if (!db.objectStoreNames.contains(BA_STORE)) {
                const store = db.createObjectStore(BA_STORE, { keyPath: 'id' });
                store.createIndex('book', 'bookKey');
            }
            if (!db.objectStoreNames.contains(BA_BLOB_STORE)) {
                const blobs = db.createObjectStore(BA_BLOB_STORE, { keyPath: 'id' });
                blobs.createIndex('book', 'bookKey');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }).catch(err => { baDbPromise = null; throw err; });
    return baDbPromise;
}
const baReq = req => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
const baTxDone = tx => new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(tx.error); });
// The description of every track of a book (the Blobs stay in BA_BLOB_STORE and are only read when a track is played).
// The bookKey ends with the file's lastModified (js/navigation.js bookKeyFor). The same PDF copied or sent to another
// place gets a new lastModified, so its key changes and its tracks would vanish. Match such tracks by name and size too.
const baLooseKey = key => String(key).replace(/_\d+$/, '');
async function baList(bookKey) {
    const db = await baDb();
    const store = db.transaction(BA_STORE, 'readonly').objectStore(BA_STORE);
    let rows = await baReq(store.index('book').getAll(IDBKeyRange.only(bookKey)));
    if (!rows.length) {
        const loose = baLooseKey(bookKey);
        rows = (await baReq(store.getAll())).filter(r => baLooseKey(r.bookKey) === loose);
    }
    return rows.map(({ blob, ...meta }) => meta);
}
async function baPut(record) {
    const { blob, ...meta } = record;
    const db = await baDb(), tx = db.transaction([BA_STORE, BA_BLOB_STORE], 'readwrite');
    tx.objectStore(BA_STORE).put(meta);
    tx.objectStore(BA_BLOB_STORE).put({ id: meta.id, bookKey: meta.bookKey, blob });
    await baTxDone(tx);
}
async function baGetBlob(id) {
    const db = await baDb();
    const row = await baReq(db.transaction(BA_BLOB_STORE, 'readonly').objectStore(BA_BLOB_STORE).get(id));
    if (row && row.blob) return row.blob;
    const legacy = await baReq(db.transaction(BA_STORE, 'readonly').objectStore(BA_STORE).get(id));
    return legacy ? legacy.blob : null;
}
// Removes what baList shows for this book, so the Remove button also clears tracks found by name and size.
async function baDeleteBook(bookKey) {
    const db = await baDb(), tx = db.transaction([BA_STORE, BA_BLOB_STORE], 'readwrite');
    const loose = baLooseKey(bookKey);
    for (const storeName of [BA_STORE, BA_BLOB_STORE]) {
        const store = tx.objectStore(storeName);
        const rows = await baReq(store.getAll());
        for (const row of rows) if (baLooseKey(row.bookKey) === loose) store.delete(row.id);
    }
    await baTxDone(tx);
}

// ---------- file names -> (disc, track) ---------------------------------------------------------------------------------------
const BA_AUDIO_RE = /\.(?:mp3|m4a|m4b|aac|wav|ogg|oga|opus|flac|wma|aif|aiff)$/i;
const baIsAudio = file => (file.type && file.type.startsWith('audio/')) || BA_AUDIO_RE.test(file.name || '');
// «A1 CD1/01 Track 01.m4a», «CD2 - 05.mp3», «Piste 12.mp3», «FLS2_EP01_P3.mp3», «01 Track 01 1.m4a» (the trailing 1 = a second copy of the number).
function baParseFile(name, path) {
    const base = String(name || '').replace(/\.[^.]+$/, '');
    const segments = String(path || name || '').split('/');
    let cd = null;
    for (const seg of segments.slice(0, -1).reverse()) {
        const m = seg.match(/(?:^|[^\p{L}])(?:cd|disc|disk|диск)\s*[-_ ]?\s*0*([1-9])(?![\p{L}\d])/iu);
        if (m) { cd = Number(m[1]); break; }
    }
    if (cd === null) { const m = base.match(/(?:^|[^\p{L}])(?:cd|disc)\s*[-_ ]?\s*0*([1-9])(?![\p{L}\d])/iu); if (m) cd = Number(m[1]); }
    let track = null, copy = 0, m = base.match(/(?:^|[^\p{L}\d])(?:track|piste|plage|pista|tr|p)[ _-]*0*([1-9]\d{0,2})(?![\p{L}\d])/iu);
    if (m) {
        track = Number(m[1]);
        const dup = base.slice(m.index + m[0].length).match(/^[\s_(-]*(\d)\)?\s*$/);
        if (dup) copy = Number(dup[1]);
    } else if ((m = base.match(/^\s*0*([1-9]\d{0,2})(?![\d])/))) track = Number(m[1]);
    else if ((m = base.match(/0*([1-9]\d{0,2})(?!.*\d)/))) track = Number(m[1]);
    return { name, path: path || name, cd, track, copy };
}
// A plain file picker has no folder names, so two sets with the same track numbers cannot be told apart by CD: the ones whose name
// carries a copy suffix («Track 01 1») are the later disc. Only tracks without a disc of their own are touched.
function baAssignDiscs(parsed) {
    const loose = parsed.filter(p => p.cd === null && p.track !== null);
    const byTrack = new Map();
    for (const p of loose) { if (!byTrack.has(p.track)) byTrack.set(p.track, []); byTrack.get(p.track).push(p); }
    for (const group of byTrack.values()) {
        if (group.length < 2) continue;
        group.sort((a, b) => a.copy - b.copy || String(a.path).localeCompare(String(b.path), undefined, { numeric: true }));
        group.forEach((p, i) => { p.cd = i + 1; });
    }
    return parsed;
}
function baLabel(cd, track) { return (cd ? 'CD' + cd + ' · ' : '') + 'piste ' + track; }
// The track a mark names: the exact disc, else a disc-less track number that exists once.
function baFind(cd, track, tracks = bookAudio.tracks) {
    const same = tracks.filter(x => x.track === track);
    if (cd) {
        const exact = same.find(x => x.cd === cd);
        if (exact) return { rec: exact };
        const open = same.filter(x => x.cd === null);
        return open.length === 1 && same.length === 1 ? { rec: open[0] } : { rec: null };
    }
    if (same.length === 1) return { rec: same[0] };
    return { rec: null, ambiguous: same.length > 1 };
}

// ---------- marks in the text -----------------------------------------------------------------------------------------------
// «CD2 - piste 35», «CD2- piste 34», «CD1 - Piste 3», or a bare «piste 37» (a mark whose disc sits in another text item).
const BA_MARK_RE = /(^|[^\p{L}\p{N}])(?:CD\s*([1-9])\s*[-–—:.]*\s*(?:piste|plage|track|pista)\s*0*([1-9]\d{0,2})|(?:piste|plage|pista)\s*0*([1-9]\d{0,2}))(?![\p{L}\p{N}])/giu;
function baFindMarks(text) {
    const out = [];
    for (const m of String(text).matchAll(BA_MARK_RE)) out.push({ cd: m[2] ? Number(m[2]) : null, track: Number(m[3] || m[4]), start: m.index + m[1].length, end: m.index + m[0].length });
    return out;
}
// The page's text items -> the boxes (in viewport pixels) of every mark. Items of one line are joined (a gap wider than a fifth of the
// font height is a space); a mark inside a longer item is placed by its characters' share of the item's width.
function baMarkBoxes(items, vp) {
    if (!items || !items.some(it => /piste|plage|track|pista/i.test(it.str || ''))) return [];
    const lines = [];
    for (const it of items) {
        if (!it.str || !it.transform) continue;
        const t = it.transform, size = Math.hypot(t[2], t[3]) || it.height || 1;
        let line = lines.find(l => Math.abs(l.y - t[5]) <= size * 0.45);
        if (!line) { line = { y: t[5], size, parts: [] }; lines.push(line); }
        line.parts.push(it);
    }
    const boxes = [];
    for (const line of lines) {
        line.parts.sort((a, b) => a.transform[4] - b.transform[4]);
        let text = '', last = null;
        const spans = [];
        for (const it of line.parts) {
            if (last && it.transform[4] - (last.transform[4] + (last.width || 0)) > line.size * 0.2 && !/\s$/.test(text) && !/^\s/.test(it.str)) text += ' ';
            spans.push({ it, from: text.length, to: text.length + it.str.length });
            text += it.str; last = it;
        }
        for (const mark of baFindMarks(text)) {
            let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
            for (const s of spans) {
                const a = Math.max(mark.start, s.from), b = Math.min(mark.end, s.to);
                if (b <= a || !s.it.str.length) continue;
                const t = s.it.transform, len = Math.hypot(t[0], t[1]) || 1, w = s.it.width || 0, h = s.it.height || Math.hypot(t[2], t[3]);
                const f0 = (a - s.from) / s.it.str.length, f1 = (b - s.from) / s.it.str.length;
                const dx = t[0] / len, dy = t[1] / len, ux = t[2] / (Math.hypot(t[2], t[3]) || 1), uy = t[3] / (Math.hypot(t[2], t[3]) || 1);
                for (const [along, up] of [[f0 * w, 0], [f1 * w, 0], [f0 * w, h], [f1 * w, h]]) {
                    const [px, py] = vp.convertToViewportPoint(t[4] + dx * along + ux * up, t[5] + dy * along + uy * up);
                    x1 = Math.min(x1, px); y1 = Math.min(y1, py); x2 = Math.max(x2, px); y2 = Math.max(y2, py);
                }
            }
            if (x1 < x2 && y1 < y2) boxes.push({ cd: mark.cd, track: mark.track, x1, y1, x2, y2 });
        }
    }
    return boxes;
}
// The layer of buttons over a page's marks; the page's wrapper takes it beside the link layer (js/pdf-render.js).
function buildPdfAudioLayer(items, vp, pageNum) {
    const boxes = baMarkBoxes(items, vp);
    if (!boxes.length) return null;
    const layer = document.createElement('div');
    layer.className = 'pdf-audio-layer';
    layer.style.width = `${vp.width}px`; layer.style.height = `${vp.height}px`;
    const minW = 46, minH = 28;
    for (const b of boxes) {
        const cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2, w = Math.max(b.x2 - b.x1 + 8, minW), h = Math.max(b.y2 - b.y1 + 6, minH);
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'pdf-audio-marker';
        btn.dataset.cd = b.cd === null ? '' : String(b.cd); btn.dataset.track = String(b.track); btn.dataset.page = String(pageNum);
        btn.style.left = `${Math.max(0, cx - w / 2)}px`; btn.style.top = `${Math.max(0, cy - h / 2)}px`; btn.style.width = `${w}px`; btn.style.height = `${h}px`;
        btn.addEventListener('pointerdown', e => e.stopPropagation());   // not the start of a text selection, a pan or a pinch
        btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); tapBookAudioMark(btn); });
        layer.appendChild(btn);
    }
    syncAudioMarkers(layer);
    return layer;
}

// ---------- the library of the open book ------------------------------------------------------------------------------------
const bookAudio = { key: null, tracks: [], playing: null };
async function refreshBookAudio() {
    const key = state.bookKey;
    bookAudio.key = key;
    if (typeof bsRefresh === 'function') bsRefresh();   // the book's narration (js/book-speech.js), read with its tracks
    if (!key) bookAudio.tracks = [];
    else {
        try { const rows = await baList(key); if (bookAudio.key !== key) return; bookAudio.tracks = rows; }
        catch (e) { bookAudio.tracks = []; }
    }
    syncAudioMarkers(); syncAudioMenuRow(); renderBookAudioDialog();
}
// A book was opened (js/main.js): its own tracks, and the previous book's recording stops.
function onBookAudioBookChanged() {
    if (bookAudio.key && bookAudio.key !== state.bookKey) stopBookAudio();
    bookAudio.tracks = [];
    refreshBookAudio();
}
// Every mark on screen shows whether its track is on this device (solid) or not yet (dashed), and which one plays.
function syncAudioMarkers(root = document) {
    for (const btn of root.querySelectorAll('.pdf-audio-marker')) {
        const cd = btn.dataset.cd ? Number(btn.dataset.cd) : null, track = Number(btn.dataset.track), found = baFind(cd, track).rec;
        const label = baLabel(cd, track);
        btn.classList.toggle('has-audio', !!found);
        btn.classList.toggle('playing', !!found && !!bookAudio.playing && bookAudio.playing.id === found.id && !baAudio.paused);
        btn.setAttribute('aria-label', t('baPlayMark').replace('{label}', label)); btn.title = label;
    }
}
function syncAudioMenuRow() {
    const desc = document.getElementById('mr-audio-d');
    if (desc) desc.textContent = bookAudio.tracks.length ? t('baCount').replace('{n}', bookAudio.tracks.length) : t('mAudioDesc');
}

// ---------- importing files ---------------------------------------------------------------------------------------------------
let baImporting = false;
async function importBookAudio(fileList) {
    const key = state.bookKey;
    if (!key || baImporting) return;
    let files = Array.from(fileList || []).filter(baIsAudio);
    // a book narration chosen here by mistake (it is an MP3 too) goes where it belongs, not in as «track 4» of «Par ici 3-4»
    const narrations = [];
    if (typeof bsUnpack === 'function') {
        for (const f of files) {
            if (!/\.mp3$/i.test(f.name)) continue;
            let packed = null;
            try { packed = await bsUnpack(f); } catch (e) { /* not readable as a narration */ }
            if (packed && bsValidMeta(packed.meta)) narrations.push(f);
        }
        files = files.filter(f => !narrations.includes(f));
        if (narrations.length) bsNote('tracks-narration', { files: narrations.map(f => f.name) });
    }
    if (!files.length) { if (narrations.length) bsImport(narrations); else showToast(t('baNoFiles')); return; }
    baImporting = true;
    const parsed = baAssignDiscs(files.map(f => Object.assign(baParseFile(f.name, f.webkitRelativePath || ''), { file: f }))).filter(p => p.track !== null);
    const total = parsed.reduce((n, p) => n + p.file.size, 0);
    let saved = 0, failed = false;
    try {
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        if (total > BA_MAX_BYTES) throw Object.assign(new Error('too big'), { name: 'QuotaExceededError' });
        for (const p of parsed) {
            if (state.bookKey !== key) break;
            setBookAudioProgress(t('baSaving').replace('{i}', saved + 1).replace('{n}', parsed.length), saved / parsed.length);
            await baPut({ id: key + '\u0000' + (p.cd || 0) + '-' + p.track, bookKey: key, cd: p.cd, track: p.track, name: p.name, path: p.path, type: p.file.type || '', size: p.file.size, blob: p.file });
            saved++;
        }
    } catch (err) {
        failed = true;
        showToast(err && err.name === 'QuotaExceededError' ? t('baNoSpace') : t('error'));
    }
    baImporting = false;
    setBookAudioProgress('', 0);
    await refreshBookAudio();
    if (!failed && saved) showToast(t('baSaved').replace('{n}', saved));
    if (narrations.length) bsImport(narrations);
}

// ---------- playback ----------------------------------------------------------------------------------------------------------
const baAudio = new Audio();
baAudio.preload = 'auto';
let baUrl = null, baSilentUrl = null;
// A silent clip played inside the tap itself: Safari lets a later play() through only after a play() made in a user gesture.
function baUnlock() {
    try {
        if (!baSilentUrl) {
            const wav = new Uint8Array([82, 73, 70, 70, 38, 0, 0, 0, 87, 65, 86, 69, 102, 109, 116, 32, 16, 0, 0, 0, 1, 0, 1, 0, 64, 31, 0, 0, 128, 62, 0, 0, 2, 0, 16, 0, 100, 97, 116, 97, 2, 0, 0, 0, 0, 0]);
            baSilentUrl = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
        }
        if (baAudio.paused && !bookAudio.playing && !baAudio.currentSrc) { baAudio.src = baSilentUrl; const p = baAudio.play(); if (p && p.catch) p.catch(() => {}); }
    } catch (e) { /* no unlock: the real play() decides */ }
}
function tapBookAudioMark(btn) {
    baUnlock();
    const cd = btn.dataset.cd ? Number(btn.dataset.cd) : null, track = Number(btn.dataset.track), label = baLabel(cd, track);
    const { rec, ambiguous } = baFind(cd, track);
    if (typeof bsNote === 'function') bsNote('mark', { label, tracks: bookAudio.tracks.length, found: !!rec, ambiguous: !!ambiguous });
    if (!bookAudio.tracks.length) { openBookAudioDialog(t('baConnect')); return; }
    if (ambiguous) { showToast(t('baAmbiguous').replace('{label}', label)); return; }
    if (!rec) { openBookAudioDialog(t('baMissing').replace('{label}', label)); return; }   // the dialog adds the missing files
    playBookTrack(rec, label);
}
async function playBookTrack(rec, label) {
    // The same track again: the tap pauses / resumes it.
    if (bookAudio.playing && bookAudio.playing.id === rec.id && baUrl && baAudio.src === baUrl) { baAudio.paused ? baAudio.play().catch(() => {}) : baAudio.pause(); return; }
    let blob = null;
    try { blob = await baGetBlob(rec.id); } catch (e) { /* unreadable */ }
    if (!blob) { showToast(t('baError')); return; }
    if (typeof stopGlobalTTS === 'function') stopGlobalTTS();
    if (typeof stopTooltipSpeech === 'function') stopTooltipSpeech();
    if (typeof cancelSpeech === 'function') cancelSpeech(true);
    if (baUrl) URL.revokeObjectURL(baUrl);
    baUrl = URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: rec.type || 'audio/mpeg' }));
    bookAudio.playing = { id: rec.id, label };
    baAudio.src = baUrl;
    baAudio.playbackRate = bookAudioRate();
    showAudioPlayer(label);
    try { await baAudio.play(); } catch (e) { if (e && e.name !== 'AbortError') { showToast(t('baError')); syncAudioPlayer(); } }
    syncAudioMarkers();
}
function pauseBookAudio() { if (!baAudio.paused) baAudio.pause(); }
function stopBookAudio() {
    baAudio.pause();
    try { baAudio.currentTime = 0; } catch (e) { /* not seekable */ }
    if (baUrl) { URL.revokeObjectURL(baUrl); baUrl = null; }
    bookAudio.playing = null;
    hideAudioPlayer(); syncAudioMarkers();
}
const BA_RATES = [0.75, 1, 1.25, 1.5];
function bookAudioRate() { try { const r = Number(localStorage.getItem('reader_audio_rate')); return BA_RATES.includes(r) ? r : 1; } catch (e) { return 1; } }
function setBookAudioRate(rate) { try { localStorage.setItem('reader_audio_rate', String(rate)); } catch (e) { /* not remembered */ } baAudio.playbackRate = rate; syncAudioPlayer(); }
const baTime = s => { s = Math.max(0, Math.floor(Number.isFinite(s) ? s : 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ---------- the player ----------------------------------------------------------------------------------------------------------
function audioPlayerEl() {
    let el = document.getElementById('audio-player');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'audio-player'; el.hidden = true; el.setAttribute('role', 'group');
    el.innerHTML = '<button type="button" class="ap-btn ap-toggle" id="ap-toggle"><svg class="mi" aria-hidden="true"><use href="#i-play"/></svg></button>'
        + '<div class="ap-main"><div class="ap-label" id="ap-label"></div><input type="range" class="ap-seek" id="ap-seek" min="0" max="1000" value="0" step="1">'
        + '<div class="ap-time"><span id="ap-cur">0:00</span><span id="ap-dur">0:00</span></div></div>'
        + '<button type="button" class="ap-chip" id="ap-rate"></button>'
        + '<button type="button" class="ap-btn ap-close" id="ap-close"><svg class="mi" aria-hidden="true"><use href="#i-close"/></svg></button>';
    document.body.appendChild(el);
    const seek = el.querySelector('#ap-seek');
    el.querySelector('#ap-toggle').onclick = () => { baAudio.paused ? baAudio.play().catch(() => {}) : baAudio.pause(); };
    el.querySelector('#ap-close').onclick = stopBookAudio;
    el.querySelector('#ap-rate').onclick = () => setBookAudioRate(BA_RATES[(BA_RATES.indexOf(bookAudioRate()) + 1) % BA_RATES.length]);
    seek.oninput = () => { if (Number.isFinite(baAudio.duration)) baAudio.currentTime = baAudio.duration * seek.value / 1000; };
    for (const ev of ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'durationchange']) baAudio.addEventListener(ev, () => { syncAudioPlayer(); if (ev !== 'timeupdate') syncAudioMarkers(); });
    baAudio.addEventListener('error', () => { if (bookAudio.playing && baAudio.currentSrc && baAudio.src === baUrl) showToast(t('baError')); });
    return el;
}
function showAudioPlayer(label) { const el = audioPlayerEl(); el.hidden = false; el.querySelector('#ap-label').textContent = label; syncAudioPlayer(); }
function hideAudioPlayer() { const el = document.getElementById('audio-player'); if (el) el.hidden = true; }
function syncAudioPlayer() {
    const el = document.getElementById('audio-player');
    if (!el) return;
    const toggle = el.querySelector('#ap-toggle'), seek = el.querySelector('#ap-seek');
    toggle.querySelector('use').setAttribute('href', baAudio.paused ? '#i-play' : '#i-pause');
    const name = t(baAudio.paused ? 'baPlay' : 'baPause');
    toggle.setAttribute('aria-label', name); toggle.title = name;
    el.setAttribute('aria-label', t('mAudio'));
    seek.setAttribute('aria-label', t('baSeek'));
    if (document.activeElement !== seek) seek.value = Number.isFinite(baAudio.duration) && baAudio.duration > 0 ? Math.round(1000 * baAudio.currentTime / baAudio.duration) : 0;
    el.querySelector('#ap-cur').textContent = baTime(baAudio.currentTime);
    el.querySelector('#ap-dur').textContent = baTime(baAudio.duration);
    const rate = el.querySelector('#ap-rate');
    rate.textContent = bookAudioRate() + '×'; rate.setAttribute('aria-label', t('baSpeed') + ' ' + bookAudioRate() + '×'); rate.title = t('baSpeed');
    const close = el.querySelector('#ap-close'); close.setAttribute('aria-label', t('baClose')); close.title = t('baClose');
}

// ---------- the dialog: choose the folder / files, status, remove -------------------------------------------------------------
function bookAudioDialog() { return document.getElementById('book-audio-dialog'); }
function setBookAudioProgress(text, fraction) {
    const box = document.getElementById('ba-progress');
    if (!box) return;
    box.hidden = !text;
    box.querySelector('.ba-progress-text').textContent = text;
    box.querySelector('.ba-progress-bar').style.setProperty('--ba-fraction', String(Math.max(0, Math.min(1, fraction))));
}
function renderBookAudioDialog(message) {
    const dialog = bookAudioDialog();
    if (!dialog || !dialog.querySelector('.ba-body')) return;
    const subName = state.bookFileName || (state.bookKey ? String(state.bookKey).replace(/:\d+$/, '') : '');
    dialog.querySelector('.ba-subtitle').textContent = (typeof shelfTitle === 'function' ? shelfTitle(subName) : subName) || '';
    const speech = typeof bsActiveSet === 'function' ? bsActiveSet() : null;
    const parts = [bookAudio.tracks.length ? t('baCount').replace('{n}', bookAudio.tracks.length) : t('baNone')];
    if (speech) parts.push(t('spkCount').replace('{n}', speech.sentences.length));
    const dictionaries = typeof bsSets !== 'undefined' ? bsSets.global.length : 0;
    if (dictionaries) parts.push(t('spkDictCount').replace('{n}', dictionaries));
    dialog.querySelector('.ba-status').textContent = parts.join(' · ');
    const msg = dialog.querySelector('.ba-message');
    if (message !== undefined) msg.textContent = message;
    msg.hidden = !msg.textContent;
    dialog.querySelector('.ba-remove').hidden = !bookAudio.tracks.length;
    dialog.querySelector('.ba-speech-remove').hidden = !speech;
    dialog.querySelector('.ba-dict-remove').hidden = !dictionaries;
}
function buildBookAudioDialog() {
    const dialog = bookAudioDialog();
    if (!dialog || dialog.querySelector('.ba-body')) return;
    dialog.innerHTML = '<div class="ba-head"><span class="pn-icon" aria-hidden="true"><svg class="mi"><use href="#i-audio"/></svg></span>'
        + '<div class="pn-titles"><h3 class="ba-title"></h3><p class="pn-sub ba-subtitle"></p></div>'
        + '<button type="button" class="close-panel-btn ba-close"><svg class="mi" aria-hidden="true"><use href="#i-close"/></svg></button></div>'
        + '<div class="ba-body"><p class="ba-status"></p><p class="ba-message" hidden></p>'
        + '<div class="ba-actions"><button type="button" class="btn-primary ba-folder"></button><button type="button" class="btn-secondary ba-files"></button><button type="button" class="btn-secondary ba-speech"></button><button type="button" class="btn-secondary ba-dict"></button></div>'
        + '<div class="ba-progress" id="ba-progress" hidden><div class="ba-progress-text"></div><div class="ba-progress-bar"></div></div>'
        + '<button type="button" class="btn-ghost ba-remove"></button><button type="button" class="btn-ghost ba-speech-remove"></button><button type="button" class="btn-ghost ba-dict-remove" hidden></button><p class="ba-note"></p></div>';
    const folder = document.createElement('input'), files = document.createElement('input'), speech = document.createElement('input');
    folder.type = 'file'; folder.multiple = true; folder.setAttribute('webkitdirectory', ''); folder.hidden = true; folder.id = 'ba-input-folder';
    files.type = 'file'; files.multiple = true; files.accept = 'audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus'; files.hidden = true; files.id = 'ba-input-files';
    speech.type = 'file'; speech.multiple = true; speech.accept = '.mp3,.json,audio/mpeg,application/json'; speech.hidden = true; speech.id = 'ba-input-speech';
    const dict = document.createElement('input');
    dict.type = 'file'; dict.multiple = true; dict.accept = '.mp3,audio/mpeg'; dict.hidden = true; dict.id = 'ba-input-dict';
    dialog.append(folder, files, speech, dict);
    dialog.querySelector('.ba-dict').onclick = () => dict.click();
    dialog.querySelector('.ba-dict-remove').onclick = () => bsRemoveDictionaries();
    dict.onchange = () => { const list = Array.from(dict.files); dict.value = ''; bsImportDictionary(list); };
    dialog.querySelector('.ba-folder').onclick = () => folder.click();
    dialog.querySelector('.ba-files').onclick = () => files.click();
    dialog.querySelector('.ba-speech').onclick = () => speech.click();
    dialog.querySelector('.ba-speech-remove').onclick = () => bsRemoveFromDialog();
    for (const input of [folder, files]) input.onchange = () => { const list = Array.from(input.files); input.value = ''; importBookAudio(list); };
    speech.onchange = () => { const list = Array.from(speech.files); speech.value = ''; bsImport(list); };
    dialog.querySelector('.ba-close').onclick = () => dialog.close();
    dialog.querySelector('.ba-remove').onclick = async () => {
        if (!state.bookKey) return;
        stopBookAudio();
        try { await baDeleteBook(state.bookKey); } catch (e) { /* nothing to remove */ }
        await refreshBookAudio();
    };
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });   // the backdrop
    labelBookAudioDialog();
}
function labelBookAudioDialog() {
    const dialog = bookAudioDialog();
    if (!dialog || !dialog.querySelector('.ba-body')) return;
    dialog.setAttribute('aria-label', t('mAudio'));
    dialog.querySelector('.ba-title').textContent = t('mAudio');
    dialog.querySelector('.ba-folder').textContent = t('baPickFolder');
    dialog.querySelector('.ba-files').textContent = t('baPickFiles');
    dialog.querySelector('.ba-speech').textContent = t('spkPick');
    dialog.querySelector('.ba-speech-remove').textContent = t('spkRemove');
    dialog.querySelector('.ba-dict').textContent = t('spkDictPick');
    dialog.querySelector('.ba-dict-remove').textContent = t('spkDictRemove');
    dialog.querySelector('.ba-remove').textContent = t('baRemove');
    dialog.querySelector('.ba-note').textContent = t('baNote');
    dialog.querySelector('.ba-close').setAttribute('aria-label', t('tClose'));
}
function openBookAudioDialog(message) {
    const dialog = bookAudioDialog();
    if (!dialog) return;
    buildBookAudioDialog();
    labelBookAudioDialog();
    renderBookAudioDialog(message || '');
    if (!dialog.open) dialog.showModal();
}
const baBtn = document.getElementById('btn-book-audio');
if (baBtn) baBtn.onclick = () => openBookAudioDialog('');
