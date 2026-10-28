/* book-audio.js — the audio that comes with a book (a French textbook: «CD1 - piste 33»): tap the mark in the PDF, hear the track.
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
    mAudioDesc: { uk: 'Діалоги й записи до підручника: тап на позначку в книзі вмикає запис', en: 'The textbook’s dialogues and recordings: tap a mark in the book to play it',
                  fr: 'Dialogues et enregistrements du manuel : touchez une mention du livre pour écouter', ru: 'Диалоги и записи к учебнику: тап по отметке в книге включает запись',
                  es: 'Diálogos y grabaciones del libro de texto: toque una marca del libro para escucharla', zh: '课本的对话和录音：点按书中的标记即可播放', ko: '교재의 대화와 녹음: 책의 표시를 누르면 재생됩니다',
                  hi: 'पाठ्यपुस्तक के संवाद और रिकॉर्डिंग: किताब में चिह्न पर टैप करें और सुनें', ga: 'Comhráite agus taifeadtaí an téacsleabhair: tapáil marc sa leabhar chun éisteacht' },
    baNone: { uk: 'До цієї книги ще не підключено аудіо.', en: 'No audio is connected to this book yet.', fr: 'Aucun audio n’est encore relié à ce livre.', ru: 'К этой книге ещё не подключено аудио.',
              es: 'Todavía no hay audio conectado a este libro.', zh: '这本书还没有连接音频。', ko: '이 책에는 아직 오디오가 연결되지 않았습니다.', hi: 'इस किताब से अभी कोई ऑडियो जुड़ा नहीं है।', ga: 'Níl aon fhuaim ceangailte leis an leabhar seo go fóill.' },
    baCount: { uk: 'Підключено доріжок: {n}', en: 'Tracks connected: {n}', fr: 'Pistes reliées : {n}', ru: 'Подключено дорожек: {n}', es: 'Pistas conectadas: {n}',
               zh: '已连接的音轨：{n}', ko: '연결된 트랙: {n}', hi: 'जुड़े ट्रैक: {n}', ga: 'Rianta ceangailte: {n}' },
    baPickFolder: { uk: 'Вибрати папку з аудіо', en: 'Choose the audio folder', fr: 'Choisir le dossier audio', ru: 'Выбрать папку с аудио', es: 'Elegir la carpeta de audio',
                    zh: '选择音频文件夹', ko: '오디오 폴더 선택', hi: 'ऑडियो फ़ोल्डर चुनें', ga: 'Roghnaigh an fillteán fuaime' },
    baPickFiles: { uk: 'Вибрати файли', en: 'Choose files', fr: 'Choisir des fichiers', ru: 'Выбрать файлы', es: 'Elegir archivos', zh: '选择文件', ko: '파일 선택', hi: 'फ़ाइलें चुनें', ga: 'Roghnaigh comhaid' },
    baDiscAsk: { uk: 'З якого диска ці файли?', en: 'Which disc are these files from?', fr: 'De quel disque viennent ces fichiers ?', ru: 'С какого диска эти файлы?', es: '¿De qué disco son estos archivos?', zh: '这些文件来自哪张光盘？', ko: '이 파일들은 어느 디스크의 것인가요?', hi: 'ये फ़ाइलें किस डिस्क की हैं?', ga: 'Cén diosca óna dtagann na comhaid seo?' },
    baDiscNone: { uk: 'Без диска', en: 'No disc', fr: 'Sans disque', ru: 'Без диска', es: 'Sin disco', zh: '无光盘', ko: '디스크 없음', hi: 'कोई डिस्क नहीं', ga: 'Gan diosca' },
    baDrop: { uk:'Або перетягніть сюди папку з аудіо (разом із підпапками)', en: 'Or drag the audio folder here (with its sub-folders)', fr: 'Ou glissez ici le dossier audio (avec ses sous-dossiers)', ru: 'Или перетащите сюда папку с аудио (вместе с подпапками)', es: 'O arrastre aquí la carpeta de audio (con sus subcarpetas)', zh: '或将音频文件夹（含子文件夹）拖到这里', ko: '또는 오디오 폴더(하위 폴더 포함)를 여기로 끌어다 놓으세요', hi: 'या ऑडियो फ़ोल्डर (उप-फ़ोल्डरों सहित) यहाँ खींचें', ga: 'Nó tarraing an fillteán fuaime (leis na fo-fhillteáin) anseo' },
    baRemove: { uk: 'Видалити аудіо цієї книги', en: 'Remove this book’s audio', fr: 'Supprimer l’audio de ce livre', ru: 'Удалить аудио этой книги', es: 'Quitar el audio de este libro',
                zh: '删除这本书的音频', ko: '이 책의 오디오 삭제', hi: 'इस किताब का ऑडियो हटाएँ', ga: 'Bain fuaim an leabhair seo' },
    baLead: { uk: 'Вкажіть папку з аудіо до цієї книги, і застосунок сам підключить усе, що в ній знайде.', en: 'Point to the folder with this book’s audio, and the app connects everything it finds there.',
              fr: 'Indiquez le dossier audio de ce livre : l’app ajoute tout ce qu’elle y trouve.', ru: 'Укажите папку с аудио к этой книге, и приложение само подключит всё, что в ней найдёт.',
              es: 'Indique la carpeta con el audio de este libro y la app conectará todo lo que encuentre.', zh: '指定这本书的音频文件夹，应用会自动连接其中找到的全部内容。', ko: '이 책의 오디오 폴더를 지정하면 앱이 찾은 것을 모두 연결합니다.',
              hi: 'इस किताब के ऑडियो वाला फ़ोल्डर चुनें, ऐप उसमें मिली हर चीज़ अपने-आप जोड़ देगा।', ga: 'Taispeáin an fillteán le fuaim an leabhair seo agus ceanglóidh an aip gach rud a aimsíonn sí ann.' },
    baManual: { uk: 'Додати вручну', en: 'Add by hand', fr: 'Ajouter à la main', ru: 'Добавить вручную', es: 'Añadir a mano', zh: '手动添加', ko: '직접 추가', hi: 'हाथ से जोड़ें', ga: 'Cuir leis de láimh' },
    baRemoveShort: { uk: 'Видалити', en: 'Remove', fr: 'Supprimer', ru: 'Удалить', es: 'Quitar', zh: '删除', ko: '삭제', hi: 'हटाएँ', ga: 'Bain' },
    baRemoveAsk: { uk: 'Видалити все аудіо цієї книги з пристрою?', en: 'Remove all of this book’s audio from the device?', fr: 'Supprimer tout l’audio de ce livre de l’appareil ?', ru: 'Удалить всё аудио этой книги с устройства?',
                   es: '¿Quitar todo el audio de este libro del dispositivo?', zh: '要从设备中删除这本书的全部音频吗？', ko: '이 책의 오디오를 기기에서 모두 삭제할까요?', hi: 'इस किताब का सारा ऑडियो डिवाइस से हटाएँ?', ga: 'An bhfuil tú chun fuaim uile an leabhair seo a bhaint den ghléas?' },
    // the status tells what really plays in THIS book: its marks, not just how many files were stored (rules §6)
    baMarksAll: { uk: 'Грають усі позначки книги: {n}', en: 'All the book’s audio marks play: {n}', fr: 'Toutes les mentions audio du livre sont jouées : {n}', ru: 'Играют все отметки книги: {n}',
                  es: 'Suenan todas las marcas de audio del libro: {n}', zh: '书中所有音频标记均可播放：{n}', ko: '책의 오디오 표시가 모두 재생됩니다: {n}', hi: 'किताब के सभी ऑडियो निशान चलते हैं: {n}', ga: 'Seinntear marcanna fuaime uile an leabhair: {n}' },
    baMarksSome: { uk: 'Грають {k} з {n} позначок книги', en: '{k} of the book’s {n} audio marks play', fr: '{k} mentions audio sur {n} sont jouées', ru: 'Играют {k} из {n} отметок книги',
                   es: 'Suenan {k} de {n} marcas de audio del libro', zh: '书中 {n} 个音频标记中有 {k} 个可播放', ko: '책의 오디오 표시 {n}개 중 {k}개가 재생됩니다', hi: 'किताब के {n} में से {k} ऑडियो निशान चलते हैं', ga: 'Seinntear {k} as {n} marc fuaime an leabhair' },
    baMarksNone: { uk: 'Підключено доріжок: {n}, але жодна позначка книги на них не вказує (напр. «{label}»). Виберіть папку із записами до цієї книги.',
                   en: 'Tracks connected: {n}, but none of the book’s marks points to them (e.g. «{label}»). Choose the folder with this book’s recordings.',
                   fr: 'Pistes reliées : {n}, mais aucune mention du livre ne les désigne (p. ex. « {label} »). Choisissez le dossier des enregistrements de ce livre.',
                   ru: 'Подключено дорожек: {n}, но ни одна отметка книги на них не указывает (напр. «{label}»). Выберите папку с записями к этой книге.',
                   es: 'Pistas conectadas: {n}, pero ninguna marca del libro las señala (p. ej. «{label}»). Elija la carpeta con las grabaciones de este libro.',
                   zh: '已连接 {n} 条音轨，但书中没有标记指向它们（如“{label}”）。请选择这本书的录音文件夹。', ko: '{n}개 트랙이 연결됐지만 책의 표시가 가리키는 트랙이 없습니다(예: “{label}”). 이 책의 녹음 폴더를 선택하세요.',
                   hi: '{n} ट्रैक जुड़े हैं, पर किताब का कोई निशान उन्हें नहीं दिखाता (जैसे “{label}”)। इस किताब की रिकॉर्डिंग वाला फ़ोल्डर चुनें।',
                   ga: 'Rianta ceangailte: {n}, ach níl aon mharc sa leabhar ag tagairt dóibh (m.sh. «{label}»). Roghnaigh fillteán taifead an leabhair seo.' },
    baMarksEmpty: { uk: 'Записів до позначок книги ще немає (позначок: {n}). Виберіть папку з аудіо до цієї книги.', en: 'No recordings for the book’s audio marks yet ({n} marks). Choose the folder with this book’s audio.',
                    fr: 'Pas encore d’enregistrements pour les mentions audio du livre ({n} mentions). Choisissez le dossier audio de ce livre.', ru: 'Записей к отметкам книги ещё нет (отметок: {n}). Выберите папку с аудио к этой книге.',
                    es: 'Aún no hay grabaciones para las marcas de audio del libro ({n} marcas). Elija la carpeta de audio de este libro.', zh: '书中的音频标记还没有录音（共 {n} 个）。请选择这本书的音频文件夹。',
                    ko: '책의 오디오 표시에 아직 녹음이 없습니다(표시 {n}개). 이 책의 오디오 폴더를 선택하세요.', hi: 'किताब के ऑडियो निशानों की रिकॉर्डिंग अभी नहीं है ({n} निशान)। इस किताब का ऑडियो फ़ोल्डर चुनें।',
                    ga: 'Níl taifid ann fós do mharcanna fuaime an leabhair ({n} marc). Roghnaigh fillteán fuaime an leabhair seo.' },
    // numbers that restart per section, no track table in the book: the marks cannot be matched, so they do not play (rules §6.2)
    baRestart: { uk: 'Позначки цієї книги нумеруються окремо в кожному розділі, а таблиці доріжок у книзі немає. Тому записи не можна зіставити з позначками, і вони не вмикаються.',
                 en: 'This book numbers its audio marks anew in each section and has no track table, so the recordings cannot be matched to the marks and do not play.',
                 fr: 'Ce livre numérote ses mentions audio dans chaque partie et n’a pas de tableau des pistes : les enregistrements ne peuvent pas être associés aux mentions et ne sont pas joués.',
                 ru: 'Отметки этой книги нумеруются отдельно в каждом разделе, а таблицы дорожек в книге нет. Поэтому записи нельзя сопоставить с отметками, и они не включаются.',
                 es: 'Este libro numera sus marcas de audio en cada sección y no tiene tabla de pistas, así que las grabaciones no se pueden asociar a las marcas y no suenan.',
                 zh: '这本书的音频标记在每个章节重新编号，书中也没有音轨对照表，因此无法把录音与标记对应，录音不会播放。',
                 ko: '이 책은 오디오 표시를 단원마다 새로 번호 매기고 트랙 표도 없어서, 녹음을 표시와 맞출 수 없으므로 재생하지 않습니다.',
                 hi: 'यह किताब हर खंड में ऑडियो निशानों की गिनती फिर से शुरू करती है और इसमें ट्रैक तालिका नहीं है, इसलिए रिकॉर्डिंग निशानों से मिलाई नहीं जा सकतीं और नहीं चलतीं।',
                 ga: 'Uimhríonn an leabhar seo a mharcanna fuaime as an nua i ngach roinn agus níl tábla rianta ann, mar sin ní féidir na taifid a mheaitseáil leis na marcanna agus ní sheinntear iad.' },
    baNoRow: { uk: 'Позначку {label} не знайдено в таблиці доріжок книги, тому запис не вмикається.', en: 'The mark {label} is not in the book’s track table, so no recording plays.',
               fr: 'La mention {label} n’est pas dans le tableau des pistes du livre : aucun enregistrement n’est joué.', ru: 'Отметка {label} не найдена в таблице дорожек книги, поэтому запись не включается.',
               es: 'La marca {label} no está en la tabla de pistas del libro, así que no suena ninguna grabación.', zh: '书的音轨对照表中没有标记 {label}，因此不会播放录音。',
               ko: '{label} 표시가 책의 트랙 표에 없어서 녹음을 재생하지 않습니다.', hi: 'निशान {label} किताब की ट्रैक तालिका में नहीं है, इसलिए कोई रिकॉर्डिंग नहीं चलती।',
               ga: 'Níl an marc {label} i dtábla rianta an leabhair, mar sin ní sheinntear aon taifead.' },
    baUnsupported: { uk: 'Файлів {ext} пропущено: {n}. Браузер не відтворює цей формат — перетворіть їх на MP3 або M4A.', en: '{ext} files skipped: {n}. The browser cannot play this format — convert them to MP3 or M4A.',
                     fr: 'Fichiers {ext} ignorés : {n}. Le navigateur ne lit pas ce format — convertissez-les en MP3 ou M4A.', ru: 'Файлов {ext} пропущено: {n}. Браузер не воспроизводит этот формат — преобразуйте их в MP3 или M4A.',
                     es: 'Archivos {ext} omitidos: {n}. El navegador no reproduce este formato: conviértalos a MP3 o M4A.', zh: '已跳过 {n} 个 {ext} 文件。浏览器无法播放此格式——请转换为 MP3 或 M4A。',
                     ko: '{ext} 파일 {n}개를 건너뛰었습니다. 브라우저가 이 형식을 재생할 수 없습니다 — MP3 또는 M4A로 변환하세요.', hi: '{ext} फ़ाइलें छोड़ी गईं: {n}। ब्राउज़र यह प्रारूप नहीं चलाता — इन्हें MP3 या M4A में बदलें।',
                     ga: 'Comhaid {ext} scipeáilte: {n}. Ní féidir leis an mbrabhsálaí an fhormáid seo a sheinm — tiontaigh go MP3 nó M4A iad.' },
    baConnected: { uk: 'Аудіо підключено', en: 'Audio connected', fr: 'Audio ajouté', ru: 'Аудио подключено', es: 'Audio conectado', zh: '音频已连接', ko: '오디오 연결됨', hi: 'ऑडियो जुड़ गया', ga: 'Fuaim ceangailte' },
    baTapHint: { uk: 'Тапніть позначку аудіо в книзі, щоб послухати.', en: 'Tap an audio mark in the book to listen.', fr: 'Touchez une mention audio du livre pour écouter.', ru: 'Коснитесь отметки аудио в книге, чтобы послушать.',
                 es: 'Toque una marca de audio del libro para escuchar.', zh: '点按书中的音频标记即可收听。', ko: '책의 오디오 표시를 누르면 들을 수 있습니다.', hi: 'सुनने के लिए किताब में ऑडियो चिह्न पर टैप करें।', ga: 'Tapáil marc fuaime sa leabhar chun éisteacht.' },
    baAutoFail: { uk: 'Аудіо в цій папці не розпізнано. Додайте файли вручну.', en: 'No audio could be recognised in this folder. Add the files by hand.', fr: 'Aucun audio reconnu dans ce dossier. Ajoutez les fichiers à la main.',
                  ru: 'Аудио в этой папке не распознано. Добавьте файлы вручную.', es: 'No se reconoció audio en esta carpeta. Añada los archivos a mano.', zh: '无法识别此文件夹中的音频。请手动添加文件。',
                  ko: '이 폴더에서 오디오를 인식하지 못했습니다. 파일을 직접 추가하세요.', hi: 'इस फ़ोल्डर में ऑडियो पहचाना नहीं गया। फ़ाइलें हाथ से जोड़ें।', ga: 'Níor aithníodh fuaim san fhillteán seo. Cuir na comhaid leis de láimh.' },
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
async function baPut(record, legacyId = null) {
    const { blob, ...meta } = record;
    const db = await baDb(), tx = db.transaction([BA_STORE, BA_BLOB_STORE], 'readwrite');
    // a track saved before sets were kept apart («<book> 0-3») is replaced by this one, not listed twice
    if (legacyId && legacyId !== meta.id) { tx.objectStore(BA_STORE).delete(legacyId); tx.objectStore(BA_BLOB_STORE).delete(legacyId); }
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
const BA_AUDIO_RE = /\.(?:mp3|m4a|m4b|mp4|aac|wav|ogg|oga|opus|flac|wma|aif|aiff)$/i;
const baIsAudio = file => (file.type && file.type.startsWith('audio/')) || BA_AUDIO_RE.test(file.name || '');
// A format this browser cannot play (WMA in Chrome) is refused with a message, never stored to fail on the first tap (rules §4.5).
const BA_PROBE_TYPES = { wma: 'audio/x-ms-wma' };
function baUnplayable(file) {
    const type = BA_PROBE_TYPES[(String(file.name || '').match(/\.([^.]+)$/) || [])[1]?.toLowerCase()];
    if (!type) return false;
    try { return !document.createElement('audio').canPlayType(type); } catch (e) { return false; }
}
// Hidden and system folders are never read (docs/agents/book_audio_rules.md §4.3): a book's «.work» folder holds thousands of
// cache files of the narration pipeline.
const baHiddenPath = path => String(path || '').split('/').slice(0, -1).some(seg => seg.startsWith('.') || seg === '__MACOSX');

// ---------- AIFF / AIFC -> WAV ----------------------------------------------------------------------------------------------------
// Chrome and Firefox cannot play AIFF (Safari can), so an AIFF track becomes WAV first: the same PCM at the same bit depth, only
// the container changes (and then Opus, below). AIFF and AIFC with «NONE» (big-endian PCM) or «sowt» (little-endian PCM) are converted; any compressed
// AIFC returns null and the file is kept as it is.
function baAiffToWav(buf) {
    if (buf.byteLength < 12) return null;
    const v = new DataView(buf), tag = o => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
    if (tag(0) !== 'FORM' || (tag(8) !== 'AIFF' && tag(8) !== 'AIFC')) return null;
    let fmt = null, sound = null;
    for (let o = 12; o + 8 <= buf.byteLength;) {
        const id = tag(o), size = v.getUint32(o + 4), body = o + 8;
        if (id === 'COMM' && size >= 18) {
            // the sample rate is an 80-bit IEEE extended float: exponent (15 bits), sign (1 bit), 64-bit mantissa
            const exponent = v.getUint16(body + 8) & 0x7fff, mantissa = v.getBigUint64(body + 10);
            let littleEndian = false;
            if (tag(8) === 'AIFC') {
                if (size < 22) return null;
                const compression = tag(body + 18);
                if (compression === 'sowt') littleEndian = true;
                else if (compression !== 'NONE') return null;
            }
            fmt = { channels: v.getUint16(body), frames: v.getUint32(body + 2), bits: v.getUint16(body + 6),
                rate: Math.round(Number(mantissa) * 2 ** (exponent - 16383 - 63)), littleEndian };
        } else if (id === 'SSND' && size >= 8) {
            sound = { start: body + 8 + v.getUint32(body), length: Math.max(0, Math.min(body + size, buf.byteLength) - (body + 8 + v.getUint32(body))) };
        }
        o = body + size + (size & 1);
    }
    if (!fmt || !sound || ![8, 16, 24, 32].includes(fmt.bits) || !fmt.channels || !fmt.rate) return null;
    const bytes = fmt.bits / 8, blockAlign = fmt.channels * bytes;
    const frames = Math.min(fmt.frames, Math.floor(sound.length / blockAlign)), pcmLength = frames * blockAlign;
    const src = new Uint8Array(buf, sound.start, pcmLength), out = new Uint8Array(44 + pcmLength), dv = new DataView(out.buffer);
    const put = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
    put(0, 'RIFF'); dv.setUint32(4, 36 + pcmLength, true); put(8, 'WAVE'); put(12, 'fmt ');
    dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, fmt.channels, true); dv.setUint32(24, fmt.rate, true);
    dv.setUint32(28, fmt.rate * blockAlign, true); dv.setUint16(32, blockAlign, true); dv.setUint16(34, fmt.bits, true);
    put(36, 'data'); dv.setUint32(40, pcmLength, true);
    // AIFF samples are signed and big-endian; WAV 8-bit samples are unsigned, WAV 16/24/32-bit samples little-endian
    for (let i = 0; i < pcmLength; i += bytes) {
        if (bytes === 1) { out[44 + i] = (src[i] + 128) & 255; continue; }
        for (let b = 0; b < bytes; b++) out[44 + i + b] = fmt.littleEndian ? src[i + b] : src[i + bytes - 1 - b];
    }
    return new Blob([out], { type: 'audio/wav' });
}

// ---------- uncompressed audio -> Opus in Ogg (rules §4.6) ------------------------------------------------------------------------
// WAV is as big as the AIFF it came from (about 10 MB a minute); Opus at 64–96 kbit/s is 10–20 times smaller and the same for
// speech. The browser decodes the file (resampled to 48 kHz, Opus's own rate), WebCodecs encodes it, and the packets are put in
// an Ogg file that <audio> plays. No encoder, or no Opus playback (some Safari versions): null, and the caller keeps WAV.
const BA_OPUS_RATE = 48000, BA_OPUS_FRAME = 960;   // 20 ms packets
const baOpusConfig = channels => ({ codec: 'opus', sampleRate: BA_OPUS_RATE, numberOfChannels: channels, bitrate: channels === 1 ? 64000 : 96000, opus: { frameDuration: 20000 } });
async function baCanOpus(channels) {
    if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined' || typeof OfflineAudioContext === 'undefined') return false;
    try {
        if (!document.createElement('audio').canPlayType('audio/ogg; codecs="opus"')) return false;
        return (await AudioEncoder.isConfigSupported(baOpusConfig(channels))).supported === true;
    } catch (e) { return false; }
}
async function baEncodeOpus(arrayBuffer) {
    const decoded = await new OfflineAudioContext(1, 1, BA_OPUS_RATE).decodeAudioData(arrayBuffer);
    const channels = Math.min(2, decoded.numberOfChannels), total = decoded.length;
    if (!total || !(await baCanOpus(channels))) return null;
    const packets = [];
    let head = null, failure = null;
    const encoder = new AudioEncoder({
        output: (chunk, meta) => {
            const bytes = new Uint8Array(chunk.byteLength); chunk.copyTo(bytes); packets.push(bytes);
            const d = meta && meta.decoderConfig && meta.decoderConfig.description;
            if (d && !head) head = d instanceof ArrayBuffer ? new Uint8Array(d) : new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
        },
        error: e => { failure = e; },
    });
    encoder.configure(baOpusConfig(channels));
    const data = Array.from({ length: channels }, (_, c) => decoded.getChannelData(c));
    for (let i = 0; i < total && !failure; i += BA_OPUS_RATE) {
        const n = Math.min(BA_OPUS_RATE, total - i), planar = new Float32Array(n * channels);
        data.forEach((d, c) => planar.set(d.subarray(i, i + n), c * n));
        const frame = new AudioData({ format: 'f32-planar', sampleRate: BA_OPUS_RATE, numberOfFrames: n, numberOfChannels: channels, timestamp: Math.round(i * 1e6 / BA_OPUS_RATE), data: planar });
        encoder.encode(frame); frame.close();
        while (encoder.encodeQueueSize > 4 && !failure) await new Promise(r => setTimeout(r, 0));   // the decoded track is in memory already: keep the queue short
    }
    await encoder.flush(); encoder.close();
    if (failure || !packets.length) return null;
    // the encoder's own «OpusHead» (when it gives one) knows its look-ahead; 312 samples is libopus's at 48 kHz
    const preSkip = head && head.length >= 12 && String.fromCharCode(...head.subarray(0, 8)) === 'OpusHead' ? head[10] | (head[11] << 8) : 312;
    return baOggOpus(packets, channels, preSkip, total, decoded.sampleRate);
}
const BA_OGG_CRC = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) { let r = i << 24; for (let k = 0; k < 8; k++) r = r & 0x80000000 ? (r << 1) ^ 0x04c11db7 : r << 1; table[i] = r >>> 0; }
    return table;
})();
// One Ogg page (RFC 3533): header, segment table (a packet of n bytes takes ⌊n/255⌋ segments of 255 and one shorter), data, CRC.
function baOggPage(packets, granule, serial, sequence, flags) {
    const lacing = [];
    for (const p of packets) { let n = p.length; while (n >= 255) { lacing.push(255); n -= 255; } lacing.push(n); }
    const bodyLength = packets.reduce((n, p) => n + p.length, 0), page = new Uint8Array(27 + lacing.length + bodyLength), v = new DataView(page.buffer);
    page.set([79, 103, 103, 83]); v.setUint8(5, flags); v.setBigUint64(6, BigInt(granule), true);
    v.setUint32(14, serial, true); v.setUint32(18, sequence, true); v.setUint8(26, lacing.length); page.set(lacing, 27);
    let o = 27 + lacing.length;
    for (const p of packets) { page.set(p, o); o += p.length; }
    let crc = 0;
    for (const byte of page) crc = ((crc << 8) ^ BA_OGG_CRC[((crc >>> 24) ^ byte) & 255]) >>> 0;
    v.setUint32(22, crc, true);
    return page;
}
// An Ogg Opus file (RFC 7845): «OpusHead», «OpusTags», then the packets about a second a page; the last page's granule
// (pre-skip + the real length) trims the encoder's padding at the end.
function baOggOpus(packets, channels, preSkip, samples, inputRate) {
    const head = new Uint8Array(19), hv = new DataView(head.buffer);
    head.set([79, 112, 117, 115, 72, 101, 97, 100]); hv.setUint8(8, 1); hv.setUint8(9, channels); hv.setUint16(10, preSkip, true);
    hv.setUint32(12, Math.round(inputRate) || BA_OPUS_RATE, true);
    const vendor = new TextEncoder().encode('ai-ebook-reader'), tags = new Uint8Array(8 + 4 + vendor.length + 4), tv = new DataView(tags.buffer);
    tags.set([79, 112, 117, 115, 84, 97, 103, 115]); tv.setUint32(8, vendor.length, true); tags.set(vendor, 12);
    const serial = (Math.random() * 0xffffffff) >>> 0, pages = [baOggPage([head], 0, serial, 0, 2), baOggPage([tags], 0, serial, 1, 0)];
    let granule = preSkip;
    for (let i = 0; i < packets.length;) {
        const group = [];
        let segments = 0;
        while (i < packets.length && group.length < 50) {
            const need = Math.floor(packets[i].length / 255) + 1;
            if (segments + need > 255) break;
            group.push(packets[i++]); segments += need;
        }
        granule += group.length * BA_OPUS_FRAME;
        const last = i >= packets.length;
        pages.push(baOggPage(group, last ? Math.min(granule, preSkip + samples) : granule, serial, pages.length, last ? 4 : 0));
    }
    return new Blob(pages, { type: 'audio/ogg' });
}
// The blob a track is stored as: AIFF, WAV and FLAC become Opus (AIFF becomes WAV where Opus cannot be made, the others stay as
// they are); compressed formats are stored untouched.
async function baPlayableBlob(file) {
    const name = file.name || '';
    if (!/\.(?:aif|aiff|wav|flac)$/i.test(name)) return file;
    let buf = await file.arrayBuffer(), fallback = file;
    if (/\.(?:aif|aiff)$/i.test(name)) {
        const wav = baAiffToWav(buf);
        if (!wav) return file;
        fallback = wav; buf = await wav.arrayBuffer();
    }
    try { const opus = await baEncodeOpus(buf); if (opus && opus.size < fallback.size) return opus; } catch (e) { /* not decodable or not encodable here: the fallback plays */ }
    return fallback;
}
// «A1 CD1/01 Track 01.m4a», «CD2 - 05.mp3», «Piste 12.mp3», «XYZ_EP01_P3.mp3», «01 Track 01 1.m4a» (the trailing 1 = a second copy of the number).
// The generic name rules of docs/agents/book_audio_rules.md §4.2: a disc («CD1», «CD1-2» = part 2 of disc 1), a section («EP01»,
// «Unit 4»), a track («Track 06», «t006», «P3»); «p011» is a page when the name has a track of its own («…_p011_t006» = track 6).
const BA_DISC_RE = /(?:^|[^\p{L}])(?:cd|disc|disk|диск)\s*[-_ ]?\s*0*([1-9])(?![\p{L}\d])/iu;
const BA_SECTION_RE = /(?:^|[^\p{L}])(?:ep|episode|épisode|unit|unité|unite|leçon|lecon|lesson|module)\s*[-_ ]?\s*0*([1-9]\d{0,2})(?![\p{L}\d])/iu;
const BA_TRACK_RE = /(?:^|[^\p{L}\d])(?:track|piste|plage|pista|tr|t)[ _-]*0*([1-9]\d{0,2})(?![\p{L}\d])/iu;
const BA_P_RE = /(?:^|[^\p{L}\d])p[ _-]*0*([1-9]\d{0,2})(?![\p{L}\d])/iu;
function baParseFile(name, path) {
    const base = String(name || '').replace(/\.[^.]+$/, '');
    const folders = String(path || name || '').split('/').slice(0, -1).reverse();
    let cd = null, section = null;
    for (const seg of folders) { const m = seg.match(BA_DISC_RE); if (m) { cd = Number(m[1]); break; } }
    if (cd === null) { const m = base.match(/(?:^|[^\p{L}])(?:cd|disc)\s*[-_ ]?\s*0*([1-9])(?![\p{L}\d])/iu); if (m) cd = Number(m[1]); }
    for (const seg of [base, ...folders]) { const m = seg.match(BA_SECTION_RE); if (m) { section = Number(m[1]); break; } }
    // the bare-number fallbacks never take the disc's or the section's own number for the track
    const rest = base.replace(BA_SECTION_RE, ' ').replace(/(?:^|[^\p{L}])(?:cd|disc)\s*[-_ ]?\s*0*[1-9](?![\p{L}\d])/iu, ' ');
    let track = null, copy = 0, m = base.match(BA_TRACK_RE) || base.match(BA_P_RE);
    if (m) {
        track = Number(m[1]);
        const dup = base.slice(m.index + m[0].length).match(/^[\s_(-]*(\d)\)?\s*$/);
        if (dup) copy = Number(dup[1]);
    } else if ((m = rest.match(/^\s*0*([1-9]\d{0,2})(?![\d])/))) track = Number(m[1]);
    else if ((m = rest.match(/0*([1-9]\d{0,2})(?!.*\d)/))) track = Number(m[1]);
    return { name, path: path || name, cd, section, track, copy };
}
// The set a track belongs to: disc tracks, section tracks and plain numbered tracks of one book are stored apart, so one set
// never overwrites another (rules §6.4). Tracks saved before this have no section and keep working as disc or plain tracks.
const baSetOf = p => p.cd ? 'cd' : p.section ? 'sec' : 'one';
// A plain file picker has no folder names, so two sets with the same track numbers cannot be told apart by CD: the ones whose name
// carries a copy suffix («Track 01 1») are the later disc. Only tracks without a disc or a section of their own are touched.
function baAssignDiscs(parsed) {
    const loose = parsed.filter(p => p.cd === null && !p.section && p.track !== null);
    const byTrack = new Map();
    for (const p of loose) { if (!byTrack.has(p.track)) byTrack.set(p.track, []); byTrack.get(p.track).push(p); }
    for (const group of byTrack.values()) {
        if (group.length < 2) continue;
        group.sort((a, b) => a.copy - b.copy || String(a.path).localeCompare(String(b.path), undefined, { numeric: true }));
        group.forEach((p, i) => { p.cd = i + 1; });
    }
    return parsed;
}
function baLabel(cd, track, kind) { return (cd ? 'CD' + cd + ' · ' : '') + (kind === 'ex' ? 'exercice ' : 'piste ') + track; }
// The track a mark names: the exact disc, else a disc-less track number that exists once. A disc mark never plays a section track
// (another set of the book); a mark without a disc prefers the one disc-less track of that number over disc tracks.
function baFind(cd, track, tracks = bookAudio.tracks) {
    const same = tracks.filter(x => x.track === track);
    if (cd) {
        const exact = same.find(x => x.cd === cd);
        if (exact) return { rec: exact };
        const open = same.filter(x => x.cd === null && !x.section);
        return open.length === 1 && same.length === 1 ? { rec: open[0] } : { rec: null };
    }
    if (same.length === 1) return { rec: same[0] };
    const discless = same.filter(x => x.cd === null);
    if (discless.length === 1) return { rec: discless[0] };
    return { rec: null, ambiguous: same.length > 1 };
}

// ---------- marks in the text -----------------------------------------------------------------------------------------------
// «CD2 - piste 35», «CD2- piste 34», «CD1 - Piste 3», «CD2 - Exercice 4», or a bare «piste 37» (a mark whose disc sits in another
// text item). «exercice N» is a mark only after its disc: alone it is the word in running text.
// A headphones icon set in a symbol font comes out of the text as one small letter glued to the mark («iCD1- piste 4»).
// A bare «plage 11» after an article is the word in running text («J'aime la plage 11. le ruisseau» in a numbered list), not a mark.
const BA_MARK_RE = /(^|[^\p{L}\p{N}])(?:\p{Ll}(?=CD\s*[1-9]))?(?:CD\s*([1-9])\s*[-–—:.]*\s*(piste|plage|track|pista|exercice|exercise)\s*0*([1-9]\d{0,2})|(?<!(?:^|[^\p{L}])(?:la|une|sa|ma|ta|cette|chaque|une autre)\s+)(?:piste|plage|pista)\s*0*([1-9]\d{0,2}))(?![\p{L}\p{N}])/giu;
function baFindMarks(text) {
    const out = [];
    for (const m of String(text).matchAll(BA_MARK_RE)) {
        const end = m.index + m[0].length;
        // «CD1 - piste 5, p. 22» (a transcript at the end of the book): the mark names the page it belongs to (rules §6.1)
        const ref = String(text).slice(end).match(/^\s*[,;(]?\s*(?:p\.|pp\.|page|pages)\s*(\d{1,3})(?!\d)/i);
        out.push({ cd: m[2] ? Number(m[2]) : null, track: Number(m[4] || m[5]), kind: /^exerc/i.test(m[3] || '') ? 'ex' : 'piste',
            ref: ref ? Number(ref[1]) : null, start: m.index + m[1].length, end });
    }
    return out;
}
// The page's text items -> the boxes (in viewport pixels) of every mark. Items of one line are joined (a gap wider than a fifth of the
// font height is a space); a mark inside a longer item is placed by its characters' share of the item's width.
// A page's text items -> its lines, top line first, each as one string with the items' places in it. Items of one line are
// joined (a gap wider than a fifth of the font height is a space); a gap of several letters is the next column of a table
// («10. plage    20. calepin») and becomes « | », so a word and the next column's number are never read as one mark.
function baTextLines(items) {
    const lines = [];
    for (const it of items || []) {
        if (!it.str || !it.transform) continue;
        const t = it.transform, size = Math.hypot(t[2], t[3]) || it.height || 1;
        let line = lines.find(l => Math.abs(l.y - t[5]) <= size * 0.45);
        if (!line) { line = { y: t[5], size, parts: [] }; lines.push(line); }
        line.parts.push(it);
    }
    lines.sort((a, b) => b.y - a.y);
    for (const line of lines) {
        line.parts.sort((a, b) => a.transform[4] - b.transform[4]);
        let text = '', last = null;
        const spans = [];
        for (const it of line.parts) {
            const gap = last ? it.transform[4] - (last.transform[4] + (last.width || 0)) : 0;
            if (last && gap > line.size * 2) text += ' | ';
            else if (last && gap > line.size * 0.2 && !/\s$/.test(text) && !/^\s/.test(it.str)) text += ' ';
            spans.push({ it, from: text.length, to: text.length + it.str.length });
            text += it.str; last = it;
        }
        line.text = text; line.spans = spans;
    }
    return lines;
}
const baXAt = (line, index) => { const s = line.spans.find(sp => index < sp.to) || line.spans[line.spans.length - 1]; return s ? s.it.transform[4] : 0; };
function baMarkBoxes(items, vp) {
    if (!items || !items.some(it => /piste|plage|track|pista|exercice|exercise/i.test(it.str || ''))) return [];
    const boxes = [];
    // top line first: a bare «piste 41» takes the disc of the «CD2 - piste 40» before it on the page (rules §6)
    let disc = null;
    for (const line of baTextLines(items)) {
        const { text, spans } = line;
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
            if (mark.cd) disc = mark.cd;
            if (x1 < x2 && y1 < y2) boxes.push({ cd: mark.cd || disc, track: mark.track, kind: mark.kind, ref: mark.ref, x1, y1, x2, y2 });
        }
    }
    return boxes;
}
// ---------- the book's own track table (rules §6.1) --------------------------------------------------------------------------
// A row: the track number on the disc, a name with its piste / exercice number, the book pages it is used on
// («12   Épisode 3 - piste 3   32», «43   Phonétique - exercice 3   167, 168»). The disc is the «CD n» header above the row's
// column. A page with five rows or more is a table page: its rows are not marks.
const BA_ROW_RE = /(?<![\p{L}\p{N}])(\d{1,3})\s+(\p{L}[\p{L}'’. ]*?(?:\s\d{1,3})?)\s*[-–—]\s*(piste|plage|track|pista|exercice|exercise)\s*0*(\d{1,3})\s+(\d{1,3}(?:\s*(?:,|et|and|à|-|–)\s*\d{1,3})*)(?![\p{L}\p{N}])/giu;
const BA_TABLE_MIN = 5;
function baTableRows(items) {
    if (!items || !items.some(it => /piste|plage|track|pista|exercice|exercise/i.test(it.str || ''))) return [];
    const lines = baTextLines(items), rows = [], heads = [];
    for (const line of lines) {
        const text = line.text.replace(/ \| /g, '   ');   // the same length: the places of the items stay right
        let found = false;
        for (const m of text.matchAll(BA_ROW_RE)) {
            found = true;
            rows.push({ track: Number(m[1]), name: m[2].trim(), kind: /^exerc/i.test(m[3]) ? 'ex' : 'piste', piste: Number(m[4]),
                pages: (m[5].match(/\d{1,3}/g) || []).map(Number), x: baXAt(line, m.index), y: line.y, size: line.size });
        }
        if (found) continue;
        for (const m of text.matchAll(/(?:^|[^\p{L}])CD\s*([1-9])(?![\p{L}\p{N}])(?!\s*[-–—]\s*(?:piste|plage|track|pista|exercice|exercise))/giu)) heads.push({ cd: Number(m[1]), x: baXAt(line, m.index + m[0].indexOf('C')), y: line.y });
    }
    if (rows.length < BA_TABLE_MIN) return [];
    for (const r of rows) {
        // the header above the row, in its column: the nearest one starting left of the row (a little slack for indents)
        const above = heads.filter(h => h.y > r.y && h.x <= r.x + r.size * 3).sort((a, b) => b.x - a.x);
        r.cd = above.length ? above[0].cd : null;
    }
    return rows;
}
// Every row of one disc's table, tracks 1…N each once — or no table for that disc (a table read wrong never decides).
function baWholeTables(rows) {
    const byDisc = new Map();
    for (const r of rows) { const k = r.cd || 0; if (!byDisc.has(k)) byDisc.set(k, []); byDisc.get(k).push(r); }
    for (const [k, list] of byDisc) {
        const tracks = list.map(r => r.track).sort((a, b) => a - b);
        if (list.length < BA_TABLE_MIN || tracks.some((n, i) => n !== i + 1)) byDisc.delete(k);
    }
    return byDisc;
}
// The table's pages are the book's own numbers; the PDF's are shifted by the cover and front pages. The shift is the most common
// difference between a mark's PDF page and the pages of the rows it can be.
function baPageShift(marks, tables) {
    const votes = new Map();
    for (const m of marks) {
        if (m.ref) continue;   // a mark that names its page says nothing about the shift
        for (const r of tables.get(m.cd || 0) || []) {
            if (r.kind !== m.kind || r.piste !== m.track) continue;
            for (const pg of r.pages) votes.set(m.page - pg, (votes.get(m.page - pg) || 0) + 1);
        }
    }
    let best = 0, n = 0;
    for (const [shift, k] of votes) if (k > n) { best = shift; n = k; }
    return n >= 3 ? best : 0;
}

// ---------- which track a mark plays (rules §6) ---------------------------------------------------------------------------------
// A mark → the disc track it means: through the book's table when it has one, as printed when the numbers run through the disc;
// none when the numbers restart per section and nothing says how (guessing would play another page's dialogue).
function baMarksReady() { return baMarks.key === state.bookKey && !!baMarks.list; }
function baRestarts(cd) {
    const marks = baMarks.list.filter(m => (m.cd || 0) === (cd || 0) && m.kind === 'piste');
    const discTracks = bookAudio.tracks.filter(x => (x.cd || 0) === (cd || 0) && !x.section).length;
    if (discTracks < 6 || !marks.length) return false;
    const firstPages = new Set(marks.filter(m => m.track === 1).map(m => m.page));
    return firstPages.size >= 3 && Math.max(...marks.map(m => m.track)) <= discTracks / 2;
}
function baTarget(m) {
    if (!baMarksReady()) return { cd: m.cd, track: m.track, pending: true };
    const tables = baMarks.tables;
    if (tables && tables.size) {
        const own = m.cd ? tables.get(m.cd) : null, pool = own ? [[m.cd, own]] : m.cd ? [] : [...tables];
        const printed = m.ref || m.page - baMarks.shift;
        let best = null, dist = Infinity;
        for (const [cd, rows] of pool) {
            for (const r of rows) {
                if (r.kind !== m.kind || r.piste !== m.track) continue;
                for (const pg of r.pages) if (Math.abs(pg - printed) < dist) { dist = Math.abs(pg - printed); best = { cd: cd || null, track: r.track, name: r.name }; }
            }
        }
        if (best && dist <= 2) return best;
        if (own || !m.cd) return { blocked: 'row' };
    }
    if (m.kind === 'ex') return { blocked: 'row' };
    if (baRestarts(m.cd)) return { blocked: 'restart' };
    return { cd: m.cd, track: m.track };
}
// The stored track a mark plays, and why not when it does not.
function baFindMark(m) {
    const target = baTarget(m);
    if (target.blocked) return { rec: null, blocked: target.blocked, target };
    return Object.assign(baFind(target.cd, target.track), { target });
}
const baMarkOf = btn => ({ cd: btn.dataset.cd ? Number(btn.dataset.cd) : null, track: Number(btn.dataset.track), kind: btn.dataset.kind || 'piste',
    page: Number(btn.dataset.page), ref: btn.dataset.ref ? Number(btn.dataset.ref) : null });

// The layer of buttons over a page's marks; the page's wrapper takes it beside the link layer (js/pdf-render.js).
function buildPdfAudioLayer(items, vp, pageNum) {
    if (baTableRows(items).length) return null;   // a table of tracks: its rows are entries, not marks
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
        btn.dataset.cd = b.cd === null ? '' : String(b.cd); btn.dataset.track = String(b.track); btn.dataset.kind = b.kind; btn.dataset.ref = b.ref ? String(b.ref) : ''; btn.dataset.page = String(pageNum);
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
    if (bookAudio.tracks.length) baScanMarks();   // a table or restarting numbers can only be seen on every page (rules §6)
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
        const m = baMarkOf(btn), found = baFindMark(m).rec, label = baLabel(m.cd, m.track, m.kind);
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
// Nothing recognisable was found: say so in the dialog and light up «Add by hand».
function baAutoFailed() {
    const dialog = bookAudioDialog();
    if (!dialog || !dialog.open) { showToast(t('baNoFiles')); return; }
    renderBookAudioDialog(t('baAutoFail'));
    dialog.querySelector('.ba-files').classList.add('ba-hint');
}
async function importBookAudio(fileList, disc = null) {
    const key = state.bookKey;
    if (!key || baImporting) return;
    let files = Array.from(fileList || []).filter(f => baIsAudio(f) && !baHiddenPath(f.webkitRelativePath));
    const refused = files.filter(baUnplayable);   // WMA in Chrome: said, not stored (rules §4.5)
    files = files.filter(f => !refused.includes(f));
    const refusedNote = () => { if (refused.length) openBookAudioDialog(t('baUnsupported').replace('{n}', refused.length).replace('{ext}', [...new Set(refused.map(f => f.name.split('.').pop().toUpperCase()))].join(', '))); };
    // a book narration chosen here by mistake (it is an MP3 too) goes where it belongs, not in as «track 4» of «textbook 3-4»
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
    if (!files.length) { if (narrations.length) bsImport(narrations); else if (refused.length) refusedNote(); else baAutoFailed(); return; }
    baImporting = true;
    const parsed = baAssignDiscs(files.map(f => {
        const p = Object.assign(baParseFile(f.name, f.webkitRelativePath || ''), { file: f });
        if (p.cd === null && !p.section && disc) p.cd = disc;   // the disc the user chose for these files: a phone's file picker does not show the folders
        return p;
    })).filter(p => p.track !== null);
    // the 📋 report: what this pick held and how it was read (a folder that «finds nothing» shows why)
    if (typeof bsNote === 'function') {
        const all = Array.from(fileList || []);
        bsNote('tracks-import', { picked: all.length, audio: files.length, hidden: all.filter(f => baHiddenPath(f.webkitRelativePath)).length,
            withPath: files.filter(f => f.webkitRelativePath).length, parsed: parsed.length, disc: disc || null,
            sets: parsed.reduce((o, p) => { const k = baSetOf(p); o[k] = (o[k] || 0) + 1; return o; }, {}),
            noTrack: files.filter(f => baParseFile(f.name, f.webkitRelativePath || '').track === null).slice(0, 3).map(f => f.name),
            sample: parsed.slice(0, 2).map(p => (p.path || p.name) + ' → ' + baLabel(p.cd, p.track)) });
    }
    const total = parsed.reduce((n, p) => n + p.file.size, 0);
    let saved = 0, failed = false;
    try {
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        if (total > BA_MAX_BYTES) throw Object.assign(new Error('too big'), { name: 'QuotaExceededError' });
        for (const p of parsed) {
            if (state.bookKey !== key) break;
            setBookAudioProgress(t('baSaving').replace('{i}', saved + 1).replace('{n}', parsed.length), saved / parsed.length);
            const blob = await baPlayableBlob(p.file);
            const id = key + '\u0000' + baSetOf(p) + '\u0000' + (p.cd || 0) + '-' + (p.section || 0) + '-' + p.track;
            await baPut({ id, bookKey: key, cd: p.cd, section: p.section, track: p.track, name: p.name, path: p.path, type: blob.type || '', size: blob.size, blob },
                p.section ? null : key + '\u0000' + (p.cd || 0) + '-' + p.track);
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
    if (!failed && !saved && !narrations.length && !refused.length) baAutoFailed();
    refusedNote();
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
async function tapBookAudioMark(btn) {
    baUnlock();
    const m = baMarkOf(btn), label = baLabel(m.cd, m.track, m.kind);
    if (!bookAudio.tracks.length) { openBookAudioDialog(t('baConnect')); return; }
    if (!baMarksReady()) {   // the book's marks are still being read: the track can depend on its table
        const key = state.bookKey;
        baScanMarks();
        try { await baMarks.busy; } catch (e) { /* read as far as it went */ }
        if (state.bookKey !== key) return;
    }
    const { rec, ambiguous, blocked, target } = baFindMark(m);
    if (typeof bsNote === 'function') bsNote('mark', { label, page: m.page, plays: target && target.track ? baLabel(target.cd, target.track) : null,
        how: blocked || (target && target.name ? 'table' : 'printed'), tracks: bookAudio.tracks.length, found: !!rec, ambiguous: !!ambiguous });
    if (blocked === 'restart') { openBookAudioDialog(t('baRestart')); return; }
    if (blocked) { openBookAudioDialog(t('baNoRow').replace('{label}', label)); return; }
    if (ambiguous) { showToast(t('baAmbiguous').replace('{label}', label)); return; }
    if (!rec) { openBookAudioDialog(t('baMissing').replace('{label}', baLabel(target.cd, target.track))); return; }   // the dialog adds the missing files
    playBookTrack(rec, target.name ? label + ' · ' + target.name : label);
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
    // the status says what plays in THIS book: how many of its marks find a track (not how many files were stored), and the narration
    const speech = typeof bsActiveSet === 'function' ? bsActiveSet() : null;
    const n = bookAudio.tracks.length, has = n > 0 || !!speech;
    const marks = baMarks.key === state.bookKey ? baMarks.list : null;
    let text = t('baNone'), ok = has, warn = false, tap = false;
    if (n && marks && marks.length) {
        const found = marks.map(m => baFindMark(m));
        const playing = found.filter(f => f.rec).length, restart = found.some(f => f.blocked === 'restart');
        const miss = marks.find((m, i) => !found[i].rec);
        if (restart) { text = t('baRestart'); ok = false; warn = true; }   // never «playing» when the numbers cannot be matched
        else if (playing === marks.length) text = t('baMarksAll').replace('{n}', playing);
        else if (playing) text = t('baMarksSome').replace('{k}', playing).replace('{n}', marks.length);
        else { text = t('baMarksNone').replace('{n}', n).replace('{label}', baLabel(miss.cd, miss.track, miss.kind)); ok = false; warn = true; }
        tap = playing > 0;
    } else if (n) { text = t('baCount').replace('{n}', n); tap = true; }
    else if (marks && marks.length) { text = t('baMarksEmpty').replace('{n}', marks.length); ok = false; warn = true; }   // the narration is not the book's recordings
    else if (speech) text = t('baConnected');
    const status = dialog.querySelector('.ba-status');
    status.textContent = text;
    status.classList.toggle('ba-ok', ok);
    status.classList.toggle('ba-warn', warn);
    status.parentElement.classList.toggle('ba-ok-box', ok);
    status.parentElement.classList.toggle('ba-warn-box', warn);
    dialog.querySelector('.ba-tap').hidden = !tap;
    const speechLine = dialog.querySelector('.ba-speech-line');
    speechLine.hidden = !speech || text === t('baConnected');   // a narration alone (a book without marks) is the status line itself
    if (speech) speechLine.textContent = t('spkCount').replace('{n}', speech.sentences.length);
    const msg = dialog.querySelector('.ba-message');
    if (message !== undefined) msg.textContent = message;
    msg.hidden = !msg.textContent;
    if (!msg.textContent) dialog.querySelector('.ba-files').classList.remove('ba-hint');
    dialog.querySelector('.ba-remove').hidden = !has;
}
// Every audio mark of the open PDF, all pages (the status counts the ones that play). Read once per book, in the background.
// The book's track table (rules §6.1) is read in the same pass: its rows, whole per disc, and the shift between its page numbers
// and the PDF's.
const baMarks = { key: null, list: null, busy: null, tables: null, shift: 0 };
function baScanMarks() {
    const key = state.bookKey, doc = state.pdfDoc;
    if (!key || state.format !== 'pdf' || !doc) return;
    if (baMarks.key === key && (baMarks.list || baMarks.busy)) return;
    baMarks.key = key; baMarks.list = null; baMarks.tables = null; baMarks.shift = 0;
    baMarks.busy = (async () => {
        const list = [], rows = [];
        for (let p = 1; p <= doc.numPages; p++) {
            if (state.bookKey !== key) return;
            try {
                const page = await doc.getPage(p), items = (await page.getTextContent()).items, table = baTableRows(items);
                if (table.length) { rows.push(...table); continue; }
                for (const b of baMarkBoxes(items, page.getViewport({ scale: 1 }))) list.push({ page: p, cd: b.cd, track: b.track, kind: b.kind, ref: b.ref });
            } catch (e) { /* a page without text */ }
        }
        if (baMarks.key !== key) return;
        const tables = baWholeTables(rows);
        baMarks.tables = tables; baMarks.shift = tables.size ? baPageShift(list, tables) : 0;
        baMarks.list = list;
        if (typeof bsNote === 'function') bsNote('marks', { marks: list.length, tableRows: rows.length, tables: Object.fromEntries([...tables].map(([cd, r]) => ['CD' + cd, r.length])), shift: baMarks.shift });
        syncAudioMarkers(); renderBookAudioDialog();
    })().finally(() => { if (baMarks.key === key) baMarks.busy = null; });
}
// A folder dropped on the dialog: every file below it, each with its path from the top of the drop (the same webkitRelativePath that
// the folder picker gives), so the disc of a sub-folder («CD 1-1», «CD2-3») is read the same way.
async function baFilesFromEntries(entries) {
    const out = [];
    const readAll = reader => new Promise((resolve, reject) => {
        const all = [];
        const next = () => reader.readEntries(batch => { if (!batch.length) resolve(all); else { all.push(...batch); next(); } }, reject);
        next();
    });
    const walk = async (entry, prefix) => {
        if (entry.isFile) {
            const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
            Object.defineProperty(file, 'webkitRelativePath', { value: prefix + entry.name, configurable: true });
            out.push(file);
        } else if (entry.isDirectory && !entry.name.startsWith('.') && entry.name !== '__MACOSX') {
            for (const child of await readAll(entry.createReader())) await walk(child, prefix + entry.name + '/');
        }
    };
    for (const entry of entries) await walk(entry, '');
    return out;
}
// Dragging a folder needs a mouse (or a touchpad): a touch screen alone has nothing to drag, so the hint would only puzzle (a UA check would fail on a phone
// in desktop mode, the pointer query does not).
function baCanDrag() { return !!(window.matchMedia && window.matchMedia('(any-pointer: fine)').matches); }
// The discs this book is known to have: the tracks already kept and the marks on the pages drawn so far.
function baKnownDiscs() {
    const discs = new Set(bookAudio.tracks.map(r => r.cd).filter(Boolean));
    document.querySelectorAll('.pdf-audio-marker').forEach(btn => { if (btn.dataset.cd) discs.add(Number(btn.dataset.cd)); });
    return Array.from(discs).sort((a, b) => a - b);
}
// Files whose names and folders tell no disc (a phone's file picker shows no folders) in a book that has discs: ask which disc they
// are from, after the pick, instead of a setting the learner has to find first. A book with bare «piste N» marks only takes them as they are.
function baImportOrAskDisc(list) {
    const dialog = bookAudioDialog(), ask = dialog && dialog.querySelector('.ba-disc-ask');
    const audio = Array.from(list || []).filter(f => baIsAudio(f) && !baHiddenPath(f.webkitRelativePath));
    const loose = baAssignDiscs(audio.map(f => baParseFile(f.name, f.webkitRelativePath || ''))).some(p => p.cd === null && !p.section && p.track !== null);
    const known = loose ? baKnownDiscs() : [];
    if (!ask || !known.length) { if (ask) ask.hidden = true; importBookAudio(list); return; }
    const choices = ask.querySelector('.ba-disc-choices');
    choices.textContent = '';
    const add = (disc, label) => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'btn-secondary'; btn.dataset.disc = disc ? String(disc) : ''; btn.textContent = label;
        btn.onclick = () => { ask.hidden = true; importBookAudio(list, disc); };
        choices.appendChild(btn);
    };
    for (let disc = 1; disc <= Math.max(2, known[known.length - 1]); disc++) add(disc, 'CD' + disc);
    add(null, t('baDiscNone'));
    ask.hidden = false;
    choices.firstChild.focus();
}
function buildBookAudioDialog() {
    const dialog = bookAudioDialog();
    if (!dialog || dialog.querySelector('.ba-body')) return;
    dialog.innerHTML = '<div class="ba-head"><span class="pn-icon" aria-hidden="true"><svg class="mi"><use href="#i-audio"/></svg></span>'
        + '<div class="pn-titles"><h3 class="ba-title"></h3><p class="pn-sub ba-subtitle"></p></div>'
        + '<button type="button" class="close-panel-btn ba-close"><svg class="mi" aria-hidden="true"><use href="#i-close"/></svg></button></div>'
        // one way in: point to the folder, the app sorts out tracks and narration; «Add by hand» when that finds nothing; one «Remove»
        + '<div class="ba-body"><p class="ba-lead"></p>'
        + '<button type="button" class="btn-primary ba-folder"></button>'
        + '<div class="ba-actions ba-row"><button type="button" class="ba-tint ba-files"></button><button type="button" class="ba-tint ba-red ba-remove"></button></div>'
        + '<p class="ba-drop"></p><p class="ba-message" hidden></p>'
        + '<div class="ba-disc-ask" hidden><p class="ba-disc-text"></p><div class="ba-actions ba-disc-choices"></div></div>'
        + '<div class="ba-progress" id="ba-progress" hidden><div class="ba-progress-text"></div><div class="ba-progress-bar"></div></div>'
        + '<div class="ba-status-box"><p class="ba-status"></p><p class="ba-speech-line" hidden></p><p class="ba-tap" hidden></p></div>'
        + '<p class="ba-note"></p></div>';
    const folder = document.createElement('input'), files = document.createElement('input');
    folder.type = 'file'; folder.multiple = true; folder.setAttribute('webkitdirectory', ''); folder.hidden = true; folder.id = 'ba-input-folder';
    files.type = 'file'; files.multiple = true; files.accept = 'audio/*,.mp3,.m4a,.mp4,.aac,.wav,.ogg,.flac,.opus,.aif,.aiff'; files.hidden = true; files.id = 'ba-input-files';
    dialog.append(folder, files);
    // a folder (with its sub-folders) dragged onto the dialog; plain files dropped on it work too. The dialog lights up while one is over it.
    const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    dialog.addEventListener('dragover', e => { if (hasFiles(e)) { e.preventDefault(); dialog.classList.add('ba-dragging'); } });
    dialog.addEventListener('dragleave', e => { if (!e.relatedTarget || !dialog.contains(e.relatedTarget)) dialog.classList.remove('ba-dragging'); });
    dialog.addEventListener('drop', async e => {
        dialog.classList.remove('ba-dragging');
        if (!hasFiles(e)) return;
        e.preventDefault();
        const entries = Array.from(e.dataTransfer.items || []).map(item => item.webkitGetAsEntry && item.webkitGetAsEntry()).filter(Boolean);
        const list = entries.length ? await baFilesFromEntries(entries) : Array.from(e.dataTransfer.files || []);
        if (list.length) baImportOrAskDisc(list);
    });
    // one button: where the browser can keep a folder (computer Chrome / Edge) it is also remembered, so later books find theirs alone
    dialog.querySelector('.ba-folder').onclick = () => { if (typeof bfSupported === 'function' && bfSupported()) bsPickAudioFolder(); else folder.click(); };
    dialog.querySelector('.ba-files').onclick = () => files.click();
    for (const input of [folder, files]) input.onchange = () => {
        const list = Array.from(input.files);
        input.value = '';
        baImportOrAskDisc(list);
    };
    dialog.querySelector('.ba-close').onclick = () => dialog.close();
    dialog.querySelector('.ba-remove').onclick = async () => {
        if (!state.bookKey || !confirm(t('baRemoveAsk'))) return;
        stopBookAudio();
        try { await baDeleteBook(state.bookKey); } catch (e) { /* nothing to remove */ }
        await refreshBookAudio();
        if (typeof bsActiveSet === 'function' && bsActiveSet()) await bsRemoveFromDialog();   // the narration goes too: one «Remove» for all of it
    };
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });   // the backdrop
    labelBookAudioDialog();
}
function labelBookAudioDialog() {
    const dialog = bookAudioDialog();
    if (!dialog || !dialog.querySelector('.ba-body')) return;
    dialog.setAttribute('aria-label', t('mAudio'));
    dialog.querySelector('.ba-title').textContent = t('mAudio');
    dialog.querySelector('.ba-lead').textContent = t('baLead');
    dialog.querySelector('.ba-folder').textContent = t('baPickFolder');
    dialog.querySelector('.ba-files').textContent = t('baManual');
    dialog.querySelector('.ba-remove').textContent = t('baRemoveShort');
    dialog.querySelector('.ba-remove').setAttribute('aria-label', t('baRemove'));
    dialog.querySelector('.ba-tap').textContent = t('baTapHint');
    dialog.querySelector('.ba-drop').textContent = t('baDrop');
    dialog.querySelector('.ba-drop').hidden = !baCanDrag();
    dialog.querySelector('.ba-disc-text').textContent = t('baDiscAsk');
    const none = dialog.querySelector('.ba-disc-choices [data-disc=""]');
    if (none) none.textContent = t('baDiscNone');
    dialog.querySelector('.ba-note').textContent = t('baNote');
    dialog.querySelector('.ba-close').setAttribute('aria-label', t('tClose'));
}
function openBookAudioDialog(message) {
    const dialog = bookAudioDialog();
    if (!dialog) return;
    buildBookAudioDialog();
    labelBookAudioDialog();
    renderBookAudioDialog(message || '');
    baScanMarks();
    if (!dialog.open) {
        dialog.querySelector('.ba-disc-ask').hidden = true;   // a question left from an earlier pick is stale
        dialog.showModal();
    }
}
const baBtn = document.getElementById('btn-book-audio');
if (baBtn) baBtn.onclick = () => openBookAudioDialog('');
