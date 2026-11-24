// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// ========== ВІД РОЗРОБНИКА (owner, 2026-10-26) ==========
// A row in the main menu's Settings opens #developer-dialog: the app is free, it runs on AI keys the developer provides,
// what the AI providers may do with the texts sent to them, how to avoid that, and «Написати розробнику» — a letter to the
// developer (mailto: the reader's own mail app, with the app version and device filled in; nothing is sent by the app itself).
// Facts behind the text: the shared OpenAI key is in OpenAI's data-sharing programme (free daily tokens in exchange for the
// right to train on the inputs); Groq's terms say it does not train on customer data and may keep logs up to 30 days for
// reliability and abuse checks (console.groq.com/docs/your-data, checked 2026-10-26).

const DEV_EMAIL = 'zavoritniigor@gmail.com';

Object.assign(I18N, {
    mDev: { uk: 'Від розробника', en: 'From the developer', fr: 'Du développeur', ru: 'От разработчика', zh: '开发者的话', ko: '개발자의 말', hi: 'डेवलपर की ओर से', ga: 'Ón bhforbróir', es: 'Del desarrollador' },
    mDevDesc: { uk: 'Безкоштовно, ключі AI, ваші тексти, написати листа', en: 'Free, AI keys, your texts, write a letter', fr: 'Gratuit, clés d’IA, vos textes, écrire un message', ru: 'Бесплатно, ключи AI, ваши тексты, написать письмо', zh: '免费、AI 密钥、你的文本、写信', ko: '무료, AI 키, 내 텍스트, 편지 쓰기', hi: 'मुफ़्त, AI कुंजियाँ, आपके पाठ, पत्र लिखें', ga: 'Saor in aisce, eochracha AI, do théacsanna, scríobh litir', es: 'Gratis, claves de IA, sus textos, escribir un mensaje' },
    devFree: { uk: 'AI E-book Reader — безкоштовний застосунок. Переклад, пояснення й граматика працюють через ключі AI, які надає розробник, тож вам нічого не потрібно платити.',
        en: 'AI E-book Reader is a free app. Translation, explanations and grammar run on AI keys provided by the developer, so you do not have to pay anything.',
        fr: 'AI E-book Reader est une application gratuite. La traduction, les explications et la grammaire fonctionnent avec des clés d’IA fournies par le développeur : vous n’avez rien à payer.',
        ru: 'AI E-book Reader — бесплатное приложение. Перевод, объяснения и грамматика работают через ключи AI, которые предоставляет разработчик, так что платить ничего не нужно.',
        zh: 'AI E-book Reader 是一款免费应用。翻译、讲解和语法功能使用开发者提供的 AI 密钥，你无需支付任何费用。',
        ko: 'AI E-book Reader는 무료 앱입니다. 번역, 설명, 문법은 개발자가 제공하는 AI 키로 작동하므로 비용을 낼 필요가 없습니다.',
        hi: 'AI E-book Reader एक मुफ़्त ऐप है। अनुवाद, व्याख्या और व्याकरण डेवलपर द्वारा दी गई AI कुंजियों से चलते हैं, इसलिए आपको कुछ भी भुगतान नहीं करना है।',
        ga: 'Is aip saor in aisce é AI E-book Reader. Oibríonn aistriúchán, mínithe agus gramadach ar eochracha AI ón bhforbróir, mar sin níl ort aon rud a íoc.',
        es: 'AI E-book Reader es una aplicación gratuita. La traducción, las explicaciones y la gramática funcionan con claves de IA que aporta el desarrollador, así que no tiene que pagar nada.' },
    devDataTitle: { uk: 'Що відбувається з вашим текстом', en: 'What happens to your text', fr: 'Ce que devient votre texte', ru: 'Что происходит с вашим текстом', zh: '你的文本会怎样', ko: '내 텍스트는 어떻게 되나요', hi: 'आपके पाठ के साथ क्या होता है', ga: 'Cad a tharlaíonn do do théacs', es: 'Qué pasa con su texto' },
    devData: { uk: 'Слова й речення, які ви перекладаєте або про які питаєте, надсилаються сервісам AI. Ключ OpenAI безкоштовний, бо входить до програми обміну даними: OpenAI може використовувати ці тексти для навчання своїх моделей. Groq, за своїми умовами, тексти для навчання не використовує (може тимчасово зберігати їх до 30 днів для перевірки збоїв). Не перекладайте особисті чи конфіденційні дані.',
        en: 'The words and sentences you translate or ask about are sent to AI services. The OpenAI key is free because it is part of a data-sharing programme: OpenAI may use these texts to train its models. Groq, by its terms, does not use the texts for training (it may keep them for up to 30 days to check for faults). Do not translate personal or confidential data.',
        fr: 'Les mots et phrases que vous traduisez ou sur lesquels vous posez une question sont envoyés à des services d’IA. La clé OpenAI est gratuite parce qu’elle fait partie d’un programme de partage de données : OpenAI peut utiliser ces textes pour entraîner ses modèles. Groq, selon ses conditions, n’utilise pas les textes pour l’entraînement (il peut les conserver jusqu’à 30 jours pour vérifier les pannes). Ne traduisez pas de données personnelles ou confidentielles.',
        ru: 'Слова и предложения, которые вы переводите или о которых спрашиваете, отправляются сервисам AI. Ключ OpenAI бесплатный, потому что входит в программу обмена данными: OpenAI может использовать эти тексты для обучения своих моделей. Groq, по своим условиям, тексты для обучения не использует (может временно хранить их до 30 дней для проверки сбоев). Не переводите личные или конфиденциальные данные.',
        zh: '你翻译或询问的词语和句子会发送给 AI 服务。OpenAI 密钥之所以免费，是因为它参加了数据共享计划：OpenAI 可能使用这些文本训练其模型。按照 Groq 的条款，它不会用这些文本进行训练（为排查故障可能最多保存 30 天）。请不要翻译个人或机密信息。',
        ko: '번역하거나 질문한 단어와 문장은 AI 서비스로 전송됩니다. OpenAI 키는 데이터 공유 프로그램에 참여하기 때문에 무료입니다. OpenAI는 이 텍스트를 모델 학습에 사용할 수 있습니다. Groq는 약관에 따라 텍스트를 학습에 사용하지 않습니다(오류 확인을 위해 최대 30일 보관할 수 있음). 개인 정보나 기밀 정보는 번역하지 마세요.',
        hi: 'आप जिन शब्दों और वाक्यों का अनुवाद करते हैं या जिनके बारे में पूछते हैं, वे AI सेवाओं को भेजे जाते हैं। OpenAI कुंजी मुफ़्त है क्योंकि वह डेटा-साझाकरण कार्यक्रम का हिस्सा है: OpenAI इन पाठों का उपयोग अपने मॉडल प्रशिक्षित करने में कर सकता है। Groq अपनी शर्तों के अनुसार पाठों का उपयोग प्रशिक्षण के लिए नहीं करता (त्रुटियाँ जाँचने के लिए 30 दिन तक रख सकता है)। निजी या गोपनीय जानकारी का अनुवाद न करें।',
        ga: 'Seoltar na focail agus na habairtí a aistríonn tú nó a gcuireann tú ceist fúthu chuig seirbhísí AI. Tá eochair OpenAI saor in aisce mar go bhfuil sí i gclár comhroinnte sonraí: féadfaidh OpenAI na téacsanna seo a úsáid chun a mhúnlaí a thraenáil. De réir a théarmaí, ní úsáideann Groq na téacsanna le haghaidh traenála (féadfaidh sé iad a choinneáil suas le 30 lá chun lochtanna a sheiceáil). Ná haistrigh sonraí pearsanta ná rúnda.',
        es: 'Las palabras y frases que traduce o sobre las que pregunta se envían a servicios de IA. La clave de OpenAI es gratuita porque forma parte de un programa de intercambio de datos: OpenAI puede usar estos textos para entrenar sus modelos. Groq, según sus condiciones, no usa los textos para entrenar (puede guardarlos hasta 30 días para revisar fallos). No traduzca datos personales o confidenciales.' },
    devAvoid: { uk: 'Хочете, щоб тексти не потрапляли до цієї програми? Вкажіть власний ключ AI у розділі «AI та офлайн-переклад» або увімкніть офлайн-переклад: він працює на пристрої.',
        en: 'Want your texts kept out of this programme? Enter your own AI key in «AI and offline translation», or turn on offline translation: it works on the device.',
        fr: 'Vous ne voulez pas que vos textes entrent dans ce programme ? Saisissez votre propre clé d’IA dans « IA et traduction hors ligne », ou activez la traduction hors ligne : elle fonctionne sur l’appareil.',
        ru: 'Хотите, чтобы тексты не попадали в эту программу? Укажите собственный ключ AI в разделе «AI и офлайн-перевод» или включите офлайн-перевод: он работает на устройстве.',
        zh: '不希望文本进入该计划？请在“AI 与离线翻译”中填写你自己的 AI 密钥，或开启离线翻译：它在设备上运行。',
        ko: '텍스트가 이 프로그램에 들어가지 않기를 원하시나요? “AI 및 오프라인 번역”에서 자신의 AI 키를 입력하거나 오프라인 번역을 켜세요. 기기에서 작동합니다.',
        hi: 'नहीं चाहते कि आपके पाठ इस कार्यक्रम में जाएँ? “AI और ऑफ़लाइन अनुवाद” में अपनी AI कुंजी डालें, या ऑफ़लाइन अनुवाद चालू करें: वह डिवाइस पर चलता है।',
        ga: 'Ní mian leat go rachadh do théacsanna sa chlár seo? Cuir isteach d’eochair AI féin in «AI agus aistriúchán as líne», nó cas air aistriúchán as líne: oibríonn sé ar an ngléas.',
        es: '¿Quiere que sus textos no entren en este programa? Introduzca su propia clave de IA en «IA y traducción sin conexión», o active la traducción sin conexión: funciona en el dispositivo.' },
    devWrite: { uk: '✉️ Написати розробнику', en: '✉️ Write to the developer', fr: '✉️ Écrire au développeur', ru: '✉️ Написать разработчику', zh: '✉️ 写信给开发者', ko: '✉️ 개발자에게 쓰기', hi: '✉️ डेवलपर को लिखें', ga: '✉️ Scríobh chuig an bhforbróir', es: '✉️ Escribir al desarrollador' },
    devWriteNote: { uk: 'Усі побажання, ідеї та помилки надсилайте мені на пошту — я читаю кожен лист. Натисніть кнопку, і відкриється ваша пошта з готовим листом.',
        en: 'Send all your wishes, ideas and bugs to me by email — I read every letter. Press the button and your mail app opens with the letter ready.',
        fr: 'Envoyez-moi tous vos souhaits, idées et bugs par e-mail : je lis chaque message. Appuyez sur le bouton et votre messagerie s’ouvre avec le message prêt.',
        ru: 'Все пожелания, идеи и ошибки присылайте мне на почту — я читаю каждое письмо. Нажмите кнопку, и откроется ваша почта с готовым письмом.',
        zh: '所有愿望、想法和错误都请发邮件给我——每封信我都会看。点击按钮，你的邮件应用会打开，信件已准备好。',
        ko: '바람, 아이디어, 오류는 모두 이메일로 보내 주세요. 모든 편지를 읽습니다. 버튼을 누르면 편지가 준비된 상태로 메일 앱이 열립니다.',
        hi: 'अपनी सभी इच्छाएँ, विचार और गलतियाँ मुझे ईमेल से भेजें — मैं हर पत्र पढ़ता हूँ। बटन दबाएँ, आपका मेल ऐप तैयार पत्र के साथ खुलेगा।',
        ga: 'Seol do mhianta, do smaointe agus fabhtanna uile chugam ar ríomhphost — léim gach litir. Brúigh an cnaipe agus osclaítear do ríomhphost leis an litir réidh.',
        es: 'Envíeme por correo todos sus deseos, ideas y errores: leo cada mensaje. Pulse el botón y se abrirá su correo con el mensaje listo.' },
    devSign: { uk: 'З повагою, Ігор Z.', en: 'Kind regards, Ihor Z.', fr: 'Cordialement, Ihor Z.', ru: 'С уважением, Игорь Z.', zh: '此致，Ihor Z.', ko: 'Ihor Z. 드림', hi: 'सादर, Ihor Z.', ga: 'Le meas, Ihor Z.', es: 'Atentamente, Ihor Z.' },
    devMailSubject: { uk: 'AI E-book Reader — побажання', en: 'AI E-book Reader — feedback', fr: 'AI E-book Reader — suggestions', ru: 'AI E-book Reader — пожелания', zh: 'AI E-book Reader — 反馈', ko: 'AI E-book Reader — 의견', hi: 'AI E-book Reader — सुझाव', ga: 'AI E-book Reader — aiseolas', es: 'AI E-book Reader — sugerencias' },
    devMailBody: { uk: 'Привіт! Мої побажання:\n\n\n\n—\nВерсія: {version}\nПристрій: {device}', en: 'Hello! My wishes:\n\n\n\n—\nVersion: {version}\nDevice: {device}', fr: 'Bonjour ! Mes souhaits :\n\n\n\n—\nVersion : {version}\nAppareil : {device}', ru: 'Привет! Мои пожелания:\n\n\n\n—\nВерсия: {version}\nУстройство: {device}', zh: '你好！我的建议：\n\n\n\n—\n版本：{version}\n设备：{device}', ko: '안녕하세요! 제 의견:\n\n\n\n—\n버전: {version}\n기기: {device}', hi: 'नमस्ते! मेरे सुझाव:\n\n\n\n—\nसंस्करण: {version}\nडिवाइस: {device}', ga: 'Dia duit! Mo mhianta:\n\n\n\n—\nLeagan: {version}\nGléas: {device}', es: '¡Hola! Mis sugerencias:\n\n\n\n—\nVersión: {version}\nDispositivo: {device}' },
    // The owner's hidden sign-in (owner, 2026-11-23): five quick taps on the logo above.
    devOwnerTitle: { uk: '🔑 Власник', en: '🔑 Owner', fr: '🔑 Propriétaire', ru: '🔑 Владелец', zh: '🔑 所有者', ko: '🔑 소유자', hi: '🔑 स्वामी', ga: '🔑 Úinéir', es: '🔑 Propietario' },
    devOwnerYes: { uk: '✅ Цей пристрій — власник: обмеження сервера зняті.', en: '✅ This device is the owner: the server\'s limits are lifted.',
        fr: '✅ Cet appareil est le propriétaire : les limites du serveur sont levées.', ru: '✅ Это устройство — владелец: ограничения сервера сняты.',
        zh: '✅ 此设备为所有者：服务器限制已解除。', ko: '✅ 이 기기가 소유자입니다: 서버 제한이 해제되었습니다.', hi: '✅ यह डिवाइस स्वामी है: सर्वर की सीमाएँ हटा दी गई हैं।',
        ga: '✅ Is é an gléas seo an t-úinéir: tá teorainneacha an fhreastalaí bainte.', es: '✅ Este dispositivo es el propietario: se han quitado los límites del servidor.' },
    devOwnerNo: { uk: 'Введіть пароль власника, щоб зняти обмеження на цьому пристрої.', en: 'Enter the owner\'s password to lift the limits on this device.',
        fr: 'Saisissez le mot de passe du propriétaire pour lever les limites sur cet appareil.', ru: 'Введите пароль владельца, чтобы снять ограничения на этом устройстве.',
        zh: '输入所有者密码以解除此设备上的限制。', ko: '이 기기의 제한을 해제하려면 소유자 비밀번호를 입력하세요.', hi: 'इस डिवाइस पर सीमाएँ हटाने के लिए स्वामी का पासवर्ड डालें।',
        ga: 'Cuir isteach pasfhocal an úinéara chun na teorainneacha a bhaint ar an ngléas seo.', es: 'Introduzca la contraseña del propietario para quitar los límites en este dispositivo.' },
    devOwnerKey: { uk: 'Пароль', en: 'Password', fr: 'Mot de passe', ru: 'Пароль', zh: '密码', ko: '비밀번호', hi: 'पासवर्ड', ga: 'Pasfhocal', es: 'Contraseña' },
    devOwnerIn: { uk: 'Увійти', en: 'Sign in', fr: 'Se connecter', ru: 'Войти', zh: '登录', ko: '로그인', hi: 'साइन इन', ga: 'Sínigh isteach', es: 'Entrar' },
    devOwnerOut: { uk: 'Вийти', en: 'Sign out', fr: 'Se déconnecter', ru: 'Выйти', zh: '退出', ko: '로그아웃', hi: 'साइन आउट', ga: 'Sínigh amach', es: 'Salir' },
    devOwnerWrong: { uk: 'Пароль не підходить.', en: 'Wrong password.', fr: 'Mot de passe incorrect.', ru: 'Пароль не подходит.', zh: '密码不正确。', ko: '비밀번호가 맞지 않습니다.', hi: 'पासवर्ड गलत है।', ga: 'Pasfhocal mícheart.', es: 'Contraseña incorrecta.' },
    devOwnerNoKey: { uk: 'На сайті ще не задано пароль (секрет OWNER_KEY у Cloudflare).', en: 'No password on the site yet (secret OWNER_KEY in Cloudflare).',
        fr: 'Aucun mot de passe sur le site pour l’instant (secret OWNER_KEY dans Cloudflare).', ru: 'На сайте ещё не задан пароль (секрет OWNER_KEY в Cloudflare).',
        zh: '网站尚未设置密码（Cloudflare 中的密钥 OWNER_KEY）。', ko: '사이트에 아직 비밀번호가 없습니다 (Cloudflare의 비밀 OWNER_KEY).', hi: 'साइट पर अभी पासवर्ड नहीं है (Cloudflare में सीक्रेट OWNER_KEY)।',
        ga: 'Níl pasfhocal ar an suíomh fós (rún OWNER_KEY in Cloudflare).', es: 'El sitio aún no tiene contraseña (secreto OWNER_KEY en Cloudflare).' },
    devOwnerFail: { uk: 'Сервер не відповів. Спробуйте ще раз.', en: 'The server did not answer. Try again.', fr: 'Le serveur n’a pas répondu. Réessayez.',
        ru: 'Сервер не ответил. Попробуйте ещё раз.', zh: '服务器没有响应。请重试。', ko: '서버가 응답하지 않았습니다. 다시 시도하세요.', hi: 'सर्वर ने जवाब नहीं दिया। फिर से कोशिश करें।',
        ga: 'Níor fhreagair an freastalaí. Bain triail eile as.', es: 'El servidor no respondió. Inténtelo de nuevo.' },
});

// The app's version as the reader has it: the content identity of its main script.
function devAppVersion() {
    const s = document.querySelector('script[src*="js/main.js"]');
    const m = s && s.getAttribute('src').match(/[?&]v=([0-9a-f]+)/);
    return m ? m[1] : '?';
}
function devMailHref() {
    const device = [navigator.platform || '', (navigator.userAgent || '').replace(/\s+/g, ' ').slice(0, 160)].filter(Boolean).join(' · ');
    const body = t('devMailBody').replace('{version}', devAppVersion()).replace('{device}', device);
    return 'mailto:' + DEV_EMAIL + '?subject=' + encodeURIComponent(t('devMailSubject')) + '&body=' + encodeURIComponent(body);
}

function devDialog() {
    let dialog = document.getElementById('developer-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'developer-dialog';
    dialog.setAttribute('aria-labelledby', 'dev-title');
    dialog.innerHTML = '<div class="dev-head"><img src="icons/icon-192.png" alt="" width="40" height="40" class="dev-logo"><h3 id="dev-title" class="dev-title"></h3>'
        + '<button type="button" class="close-panel-btn dev-close"><svg class="mi" aria-hidden="true"><use href="#i-close"/></svg></button></div>'
        + '<div class="dev-body"><p class="dev-free"></p><div class="dev-data"><p class="dev-data-title"></p><p class="dev-data-text"></p></div>'
        + '<p class="dev-avoid"></p><a class="btn-primary dev-write" rel="noopener"></a><p class="dev-write-note"></p>'
        + '<p class="dev-sign"><span class="dev-sign-name"></span> · <a class="dev-mail"></a></p>'
        + '<div class="dev-owner" hidden><p class="dev-owner-title"></p><p class="dev-owner-state"></p>'
        + '<form class="dev-owner-form"><input type="password" class="dev-owner-key" autocomplete="current-password" required>'
        + '<button type="submit" class="btn-primary dev-owner-in"></button></form><button type="button" class="dev-owner-out" hidden></button></div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('.dev-close').onclick = () => dialog.close();
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });   // a tap on the backdrop closes it
    devOwnerWire(dialog);
    return dialog;
}
function renderDeveloperDialog() {
    const d = devDialog(), set = (sel, key) => { d.querySelector(sel).textContent = t(key); };
    set('.dev-title', 'mDev'); set('.dev-free', 'devFree'); set('.dev-data-title', 'devDataTitle'); set('.dev-data-text', 'devData');
    set('.dev-avoid', 'devAvoid'); set('.dev-write', 'devWrite'); set('.dev-write-note', 'devWriteNote'); set('.dev-sign-name', 'devSign');
    d.querySelector('.dev-close').setAttribute('aria-label', t('tClose'));
    set('.dev-owner-title', 'devOwnerTitle'); set('.dev-owner-in', 'devOwnerIn'); set('.dev-owner-out', 'devOwnerOut');
    d.querySelector('.dev-owner-key').placeholder = t('devOwnerKey');
    d.querySelector('.dev-owner').hidden = true;   // hidden again every time the dialog opens
    const href = devMailHref();
    d.querySelector('.dev-write').href = href;
    const mail = d.querySelector('.dev-mail');
    mail.textContent = DEV_EMAIL; mail.href = 'mailto:' + DEV_EMAIL;
}
// ---- the owner's hidden sign-in (functions/api/owner.js) ----
// The app is the same for everyone; on the owner's devices the server lifts its own limits (functions/api/ai.js). The password
// goes to the server once and comes back as an HttpOnly cookie: it is never kept in the app or in localStorage.
async function devOwnerAsk(body) {
    try {
        const res = await fetch('/api/owner', body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, owner: data.owner === true, configured: data.configured !== false };
    } catch (e) { return { status: 0, owner: false, configured: true }; }
}
function devOwnerShow(d, r, failKey) {
    d.querySelector('.dev-owner-state').textContent = t(failKey || (r.owner ? 'devOwnerYes' : r.configured ? 'devOwnerNo' : 'devOwnerNoKey'));
    d.querySelector('.dev-owner-form').hidden = r.owner;
    d.querySelector('.dev-owner-out').hidden = !r.owner;
}
function devOwnerWire(d) {
    let taps = [];
    d.querySelector('.dev-logo').addEventListener('click', async () => {
        const now = Date.now();
        taps = taps.filter(at => now - at < 3000).concat(now);
        if (taps.length < 5) return;
        taps = [];
        d.querySelector('.dev-owner').hidden = false;
        const r = await devOwnerAsk();
        devOwnerShow(d, r, r.status === 200 ? '' : 'devOwnerFail');
    });
    d.querySelector('.dev-owner-form').addEventListener('submit', async e => {
        e.preventDefault();
        const input = d.querySelector('.dev-owner-key'), key = input.value;
        input.value = '';
        const r = await devOwnerAsk({ action: 'login', key });
        devOwnerShow(d, r, r.status === 403 ? 'devOwnerWrong' : r.status === 503 ? 'devOwnerNoKey' : r.status === 200 ? '' : 'devOwnerFail');
    });
    d.querySelector('.dev-owner-out').addEventListener('click', async () => {
        const r = await devOwnerAsk({ action: 'logout' });
        devOwnerShow(d, { owner: false, configured: true }, r.status === 200 ? '' : 'devOwnerFail');
    });
}
function openDeveloperDialog() {
    if (typeof closeFullMenu === 'function') closeFullMenu();
    renderDeveloperDialog();
    const d = devDialog();
    if (!d.open) d.showModal();
}
const devBtn = document.getElementById('btn-developer');
if (devBtn) devBtn.onclick = openDeveloperDialog;
