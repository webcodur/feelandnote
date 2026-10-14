// Native labels and manually prepared test UI; this is not a translation of the full product UI.
const fields = ['start', 'original', 'open', 'close', 'next', 'pending', 'ready', 'unavailable', 'failed', 'guide'];
const rows = {
  en: ['English', 'Translate', 'Read in English', 'Open review', 'Close', 'Load another review', 'Preparing translation…', 'Ready', 'Device translation is unavailable.', 'Translation failed. You can read in English.', 'How to use page translation'],
  ja: ['日本語', '翻訳を開始', '英語で読む', 'レビューを開く', '閉じる', '別のレビューを読む', '翻訳を準備しています…', '準備完了', 'この端末では自動翻訳を利用できません。', '翻訳できませんでした。英語で読むことができます。', 'ブラウザ翻訳の使い方'],
  zh: ['简体中文', '开始翻译', '阅读英文原文', '打开阅读背景', '关闭', '查看另一段阅读背景', '正在准备翻译…', '已就绪', '此设备无法使用站内自动翻译。', '翻译失败，您可以阅读英文原文。', '如何使用浏览器翻译'],
  'zh-Hant': ['繁體中文', '開始翻譯', '閱讀英文原文', '開啟閱讀背景', '關閉', '查看另一段閱讀背景', '正在準備翻譯…', '已就緒', '此裝置無法使用站內自動翻譯。', '翻譯失敗，您可以閱讀英文原文。', '如何使用瀏覽器翻譯'],
  es: ['Español', 'Traducir', 'Leer en inglés', 'Abrir reseña', 'Cerrar', 'Leer otra reseña', 'Preparando la traducción…', 'Listo', 'La traducción automática no está disponible en este dispositivo.', 'No se pudo traducir. Puedes leer en inglés.', 'Cómo traducir la página'],
  fr: ['Français', 'Traduire', 'Lire en anglais', 'Ouvrir la critique', 'Fermer', 'Lire une autre critique', 'Préparation de la traduction…', 'Prêt', 'La traduction automatique est indisponible sur cet appareil.', 'La traduction a échoué. Vous pouvez lire en anglais.', 'Comment traduire la page'],
  de: ['Deutsch', 'Übersetzen', 'Auf Englisch lesen', 'Rezension öffnen', 'Schließen', 'Andere Rezension lesen', 'Übersetzung wird vorbereitet…', 'Bereit', 'Automatische Übersetzung ist auf diesem Gerät nicht verfügbar.', 'Übersetzung fehlgeschlagen. Du kannst auf Englisch lesen.', 'Seitenübersetzung verwenden'],
  pt: ['Português', 'Traduzir', 'Ler em inglês', 'Abrir resenha', 'Fechar', 'Ler outra resenha', 'Preparando a tradução…', 'Pronto', 'A tradução automática não está disponível neste dispositivo.', 'A tradução falhou. Você pode ler em inglês.', 'Como traduzir a página'],
  it: ['Italiano', 'Traduci', 'Leggi in inglese', 'Apri recensione', 'Chiudi', 'Leggi un’altra recensione', 'Preparazione della traduzione…', 'Pronto', 'La traduzione automatica non è disponibile su questo dispositivo.', 'Traduzione non riuscita. Puoi leggere in inglese.', 'Come tradurre la pagina'],
};
export const LANGUAGES = Object.fromEntries(Object.entries(rows).map(([code, [name, ...values]]) =>
  [code, { name, ...Object.fromEntries(fields.map((field, index) => [field, values[index]])) }]));
const headings = {
  en: ['People & their works', 'Reading background'], ja: ['人と作品', '読書の背景'],
  zh: ['人物与作品', '阅读背景'], 'zh-Hant': ['人物與作品', '閱讀背景'],
  es: ['Personas y sus obras', 'Contexto de lectura'], fr: ['Les personnes et leurs œuvres', 'Contexte de lecture'],
  de: ['Menschen und ihre Werke', 'Lesehintergrund'], pt: ['Pessoas e suas obras', 'Contexto de leitura'],
  it: ['Persone e le loro opere', 'Contesto di lettura'],
};
const advice = {
  en: ['Use page translation in your browser, or open this page in a supported desktop browser.', 'Use Safari’s page menu to translate. Switching to Chrome on iPhone does not enable this API.', 'Use page translation in Chrome’s menu. Mobile Chrome does not provide this API.'],
  ja: ['ブラウザのページ翻訳、または対応するパソコンのブラウザをご利用ください。', 'Safariのページメニューから翻訳してください。iPhoneでChromeに変更しても、この機能は使えません。', 'Chromeのメニューからページを翻訳してください。モバイル版Chromeではこの機能を使えません。'],
  zh: ['请使用浏览器的网页翻译，或在支持此功能的电脑浏览器中打开。', '请使用Safari页面菜单中的翻译。iPhone换用Chrome也无法启用此功能。', '请使用Chrome菜单中的网页翻译。手机版Chrome不支持此功能。'],
  'zh-Hant': ['請使用瀏覽器的網頁翻譯，或在支援此功能的電腦瀏覽器中開啟。', '請使用Safari頁面選單中的翻譯。iPhone改用Chrome也無法啟用此功能。', '請使用Chrome選單中的網頁翻譯。手機版Chrome不支援此功能。'],
  es: ['Usa la traducción de páginas del navegador o abre la página en un navegador de escritorio compatible.', 'Usa la traducción del menú de Safari. Cambiar a Chrome en iPhone no habilita esta función.', 'Usa la traducción de páginas del menú de Chrome. Chrome móvil no ofrece esta función.'],
  fr: ['Utilisez la traduction de page du navigateur ou un navigateur compatible sur ordinateur.', 'Utilisez la traduction du menu de Safari. Passer à Chrome sur iPhone ne rend pas cette fonction disponible.', 'Utilisez la traduction de page du menu de Chrome. Chrome mobile ne propose pas cette fonction.'],
  de: ['Nutze die Seitenübersetzung deines Browsers oder einen unterstützten Desktop-Browser.', 'Nutze die Übersetzung im Safari-Seitenmenü. Ein Wechsel zu Chrome auf dem iPhone aktiviert diese Funktion nicht.', 'Nutze die Seitenübersetzung im Chrome-Menü. Chrome auf Mobilgeräten bietet diese Funktion nicht.'],
  pt: ['Use a tradução de páginas do navegador ou abra a página em um navegador de computador compatível.', 'Use a tradução no menu do Safari. Mudar para o Chrome no iPhone não ativa esta função.', 'Use a tradução de páginas no menu do Chrome. O Chrome para dispositivos móveis não oferece esta função.'],
  it: ['Usa la traduzione della pagina nel browser o apri la pagina in un browser desktop compatibile.', 'Usa la traduzione nel menu di Safari. Passare a Chrome su iPhone non abilita questa funzione.', 'Usa la traduzione della pagina nel menu di Chrome. Chrome per dispositivi mobili non offre questa funzione.'],
};
Object.keys(LANGUAGES).forEach(code => Object.assign(LANGUAGES[code], {
  heading: headings[code][0], dialog: headings[code][1], advice: advice[code],
}));
const fallbackSteps = {
  en: ['First choose “Read in English”, then use the browser’s page translation.', 'Copy page link', 'Link copied', 'Copy the link below and open it in your browser.'],
  ja: ['まず「英語で読む」を選び、ブラウザのページ翻訳を使ってください。', 'ページのリンクをコピー', 'リンクをコピーしました', '下のリンクをコピーしてブラウザで開いてください。'],
  zh: ['请先选择“阅读英文原文”，再使用浏览器的网页翻译。', '复制页面链接', '链接已复制', '请复制下方链接，并在浏览器中打开。'],
  'zh-Hant': ['請先選擇「閱讀英文原文」，再使用瀏覽器的網頁翻譯。', '複製頁面連結', '已複製連結', '請複製下方連結，並在瀏覽器中開啟。'],
  es: ['Elige primero «Leer en inglés» y luego usa la traducción de páginas del navegador.', 'Copiar enlace', 'Enlace copiado', 'Copia el enlace de abajo y ábrelo en tu navegador.'],
  fr: ['Choisissez d’abord « Lire en anglais », puis utilisez la traduction de page du navigateur.', 'Copier le lien', 'Lien copié', 'Copiez le lien ci-dessous et ouvrez-le dans votre navigateur.'],
  de: ['Wähle zuerst „Auf Englisch lesen“ und nutze dann die Seitenübersetzung des Browsers.', 'Seitenlink kopieren', 'Link kopiert', 'Kopiere den Link unten und öffne ihn in deinem Browser.'],
  pt: ['Escolha primeiro “Ler em inglês” e use a tradução de páginas do navegador.', 'Copiar link', 'Link copiado', 'Copie o link abaixo e abra-o no navegador.'],
  it: ['Scegli prima “Leggi in inglese”, poi usa la traduzione della pagina nel browser.', 'Copia link', 'Link copiato', 'Copia il link qui sotto e aprilo nel browser.'],
};
Object.keys(LANGUAGES).forEach(code => {
  const [fallbackStep, copyLink, copied, manualCopy] = fallbackSteps[code];
  Object.assign(LANGUAGES[code], { fallbackStep, copyLink, copied, manualCopy });
});
const externalBrowsers = {
  en: 'Open the page in your browser using the app’s menu, or copy the link below.',
  ja: 'アプリのメニューからブラウザで開くか、下のリンクをコピーしてください。',
  zh: '请通过应用菜单在浏览器中打开，或复制下方页面链接。',
  'zh-Hant': '請透過應用程式選單在瀏覽器中開啟，或複製下方頁面連結。',
  es: 'Abre la página en tu navegador desde el menú de la aplicación o copia el enlace de abajo.',
  fr: 'Ouvrez la page dans votre navigateur depuis le menu de l’application, ou copiez le lien ci-dessous.',
  de: 'Öffne die Seite über das App-Menü in deinem Browser oder kopiere den Link unten.',
  pt: 'Abra a página no navegador pelo menu do aplicativo ou copie o link abaixo.',
  it: 'Apri la pagina nel browser dal menu dell’app o copia il link qui sotto.',
};
Object.keys(LANGUAGES).forEach(code => { LANGUAGES[code].externalBrowser = externalBrowsers[code]; });
export const SOURCES = {
  intro: 'Discover books, films, games and music through the people who experienced them. Follow a person’s reading journey and explore the works connected to their life.',
  reviews: [
    'This example illustrates a reading background, rather than a summary of the book. The reader returned to it while thinking about friendship, responsibility and the choices that shape a life.',
    'The second example arrives only after the review dialog is already open. It includes a quotation: “A question can change how we see a familiar story.” This is test copy, not a historical quotation.',
    'The final example is a longer reading note.\n\nA useful recommendation explains both what a work contains and why it mattered to the reader. Those are different questions. A person may admire a book without agreeing with every claim in it.\n\nThis sample is intentionally divided into paragraphs so that translation can be checked for preserved structure and readable pacing.',
  ],
};
