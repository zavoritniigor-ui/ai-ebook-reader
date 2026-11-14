// Module graph of the app's classic scripts (index.html load order), parsed with acorn (tools/vendor/acorn-8.15.0, MIT).
//   node tools/module_graph.mjs            # checks; exit 1 on a problem
//   node tools/module_graph.mjs --report   # also prints per-file size, globals, fan-out / fan-in
// Checks, because every js/*.js shares one global scope (ARCHITECTURE.md):
//   1. no top-level name is declared by two files (a later `function x` silently replaces an earlier one);
//   2. no top-level statement (outside any function) uses a name declared by a file that loads LATER — it would throw
//      a ReferenceError on page load (the Step 1–3 production incident).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from './vendor/acorn-8.15.0/acorn.mjs';
import * as walk from './vendor/acorn-8.15.0/walk.mjs';

const rootArg = process.argv.indexOf('--root');   // another tree (the guard's own test), default: this repository
const root = rootArg > 0 ? process.argv[rootArg + 1] : join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script[^>]*\ssrc="(js\/[^"?]+)/g)].map(m => m[1]);
const idsOf = p => !p ? [] : p.type === 'Identifier' ? [p.name] : p.type === 'ObjectPattern' ? p.properties.flatMap(q => idsOf(q.value || q.argument))
    : p.type === 'ArrayPattern' ? p.elements.flatMap(idsOf) : p.type === 'AssignmentPattern' ? idsOf(p.left) : p.type === 'RestElement' ? idsOf(p.argument) : [];

const owners = new Map(), parsed = {}, problems = [];
for (const f of files) {
    const src = readFileSync(join(root, f), 'utf8');
    let ast;
    try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script' }); }
    catch (e) { problems.push(`${f}: does not parse (${e.message})`); continue; }
    const names = [];
    for (const n of ast.body) {
        if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) names.push(n.id.name);
        if (n.type === 'VariableDeclaration') for (const d of n.declarations) names.push(...idsOf(d.id));
    }
    parsed[f] = { ast, names, lines: src.split('\n').length };
    for (const name of names) owners.set(name, [...(owners.get(name) || []), f]);
}
for (const [name, fs] of owners) if (fs.length > 1) problems.push(`«${name}» is declared at top level in ${fs.join(' and ')}`);

const order = Object.fromEntries(files.map((f, i) => [f, i])), fanOut = {}, fanIn = {};
for (const f of files) {
    if (!parsed[f]) continue;
    const used = new Set();
    walk.fullAncestor(parsed[f].ast, (node, ancestors) => {
        if (node.type !== 'Identifier') return;
        const parent = ancestors[ancestors.length - 2];
        if (parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return;
        if (parent && (parent.type === 'Property' || parent.type === 'MethodDefinition') && parent.key === node && !parent.computed) return;
        const owner = (owners.get(node.name) || [])[0];
        if (!owner || owner === f) return;
        used.add(owner);
        const deferred = ancestors.some(a => a.type === 'FunctionDeclaration' || a.type === 'FunctionExpression' || a.type === 'ArrowFunctionExpression');
        if (!deferred && order[owner] > order[f]) problems.push(`${f}: top-level use of «${node.name}» from ${owner}, which loads later`);
    });
    fanOut[f] = used.size;
    for (const o of used) fanIn[o] = (fanIn[o] || 0) + 1;
}

if (process.argv.includes('--report')) {
    console.log('file\tlines\tglobals\tuses\tused-by');
    for (const f of files) if (parsed[f]) console.log(`${f}\t${parsed[f].lines}\t${parsed[f].names.length}\t${fanOut[f] || 0}\t${fanIn[f] || 0}`);
}
if (problems.length) { console.error(problems.map(p => 'FAIL ' + p).join('\n')); process.exit(1); }
console.log(`PASS module graph: ${files.length} scripts, ${owners.size} top-level names, no duplicate and no top-level forward reference`);
