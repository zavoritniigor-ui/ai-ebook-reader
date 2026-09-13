const { execSync } = require('child_process');
try {
    execSync('node --check js/selection.js');
    console.log('js/selection.js syntax is OK');
} catch (e) {
    console.log('Syntax Error in js/selection.js:\n' + e.stdout.toString() + e.stderr.toString());
}
