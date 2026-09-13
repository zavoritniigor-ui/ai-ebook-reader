const fs = require('fs');
eval(fs.readFileSync('js/lang-dicts.js', 'utf8'));
eval(fs.readFileSync('js/lang-detect.js', 'utf8'));
const s = buildLanguageSegments('Repeat: Je voudrais un café.', 'en');
console.log(JSON.stringify(s, null, 2));
