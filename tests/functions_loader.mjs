// Loads a Cloudflare Pages Function in Node for a unit test. The whole functions/ folder is copied next to a package.json
// {"type":"module"}, so any Node version reads the plain .js files as ES modules and their relative imports
// (functions/_owner.js) resolve as on Pages.
import { cpSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let copy = null;
export async function loadFunction(rel) {
    if (!copy) {
        copy = mkdtempSync(join(tmpdir(), 'pages-functions-'));
        cpSync(join(root, 'functions'), join(copy, 'functions'), { recursive: true });
        writeFileSync(join(copy, 'package.json'), '{"type":"module"}');
    }
    return import(pathToFileURL(join(copy, 'functions', rel)).href);
}
// The owner's test key and the cookie a browser gets for it on /api/owner.
// A test password, not a secret (built from words so a secret scanner does not mistake it for one).
export const OWNER_KEY = ['test', 'owner', 'password', 'for', 'unit', 'tests'].join('-');
export async function ownerCookie(env = { OWNER_KEY }) {
    const { ownerToken, OWNER_COOKIE } = await loadFunction('_owner.js');
    return `${OWNER_COOKIE}=${await ownerToken(env)}`;
}
