/* Validate EPUB/DOCX before any application parser sees the archive.
 * Fixed local JSZip; this worker is terminated on timeout or book replacement.
 */
'use strict';
importScripts('vendor/jszip-3.10.1.min.js');
const MAX_FILE = 50 * 1024 * 1024;
const MAX_ENTRIES = 4096;
const MAX_TOTAL = 64 * 1024 * 1024;
const MAX_ENTRY = 12 * 1024 * 1024;
function fail(message) { throw new Error(message); }
function directory(buffer) {
    if (buffer.byteLength > MAX_FILE || buffer.byteLength < 22) fail('Архів завеликий або пошкоджений.');
    const v = new DataView(buffer);
    let end = -1;
    for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
        if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === buffer.byteLength) { end = i; break; }
    }
    if (end < 0) fail('Не знайдено коректний каталог ZIP.');
    const count = v.getUint16(end + 10, true), size = v.getUint32(end + 12, true), start = v.getUint32(end + 16, true);
    if (v.getUint16(end + 4, true) || v.getUint16(end + 6, true) || count !== v.getUint16(end + 8, true) || count === 65535 || size === 0xffffffff || start === 0xffffffff) fail('Багатотомні та ZIP64-архіви не підтримуються.');
    if (!count || count > MAX_ENTRIES) fail('Архів містить забагато записів (максимум 4096).');
    if (start + size !== end) fail('Некоректні межі каталогу ZIP.');
    let pos = start, total = 0;
    const records = [];
    for (let i = 0; i < count; i++) {
        if (pos + 46 > end || v.getUint32(pos, true) !== 0x02014b50) fail('Пошкоджений запис ZIP.');
        const flags = v.getUint16(pos + 8, true), method = v.getUint16(pos + 10, true);
        const packed = v.getUint32(pos + 20, true), unpacked = v.getUint32(pos + 24, true);
        const nameSize = v.getUint16(pos + 28, true), extra = v.getUint16(pos + 30, true), comment = v.getUint16(pos + 32, true);
        const local = v.getUint32(pos + 42, true);
        if ((flags & 1) || ![0, 8].includes(method)) fail('Зашифрований або непідтримуваний ZIP.');
        if (!nameSize || pos + 46 + nameSize + extra + comment > end || local + 30 > start || v.getUint32(local, true) !== 0x04034b50) fail('Некоректна структура ZIP.');
        const dataStart = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
        if (dataStart + packed > start || (method === 0 && packed !== unpacked)) fail('Некоректний розмір запису ZIP.');
        total += unpacked;
        if (unpacked > MAX_ENTRY || total > MAX_TOTAL) fail('Розпакована книга завелика (64 МіБ загалом, 12 МіБ на запис).');
        records.push({ crc: v.getUint32(pos + 16, true), unpacked });
        pos += 46 + nameSize + extra + comment;
    }
    if (pos !== end) fail('Некоректний каталог ZIP.');
    return records;
}
const crcTable = Array.from({ length: 256 }, (_, i) => {
    let c = i;
    for (let n = 0; n < 8; n++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
function unpack(entry, budget) {
    return new Promise((resolve, reject) => {
        const chunks = []; let size = 0, crc = 0xffffffff, failed = false;
        const stream = entry.internalStream('uint8array');
        stream.on('data', chunk => {
            if (failed) return;
            size += chunk.length; budget.total += chunk.length;
            if (size > MAX_ENTRY || budget.total > MAX_TOTAL) {
                failed = true; stream.pause(); chunks.length = 0;
                reject(new Error('Перевищено фактичний обсяг розпакування книги.')); return;
            }
            for (const byte of chunk) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
            chunks.push(chunk);
        }).on('error', reject).on('end', () => {
            if (failed) return;
            const bytes = new Uint8Array(size); let offset = 0;
            for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
            resolve({ bytes, crc: (crc ^ 0xffffffff) >>> 0 });
        }).resume();
    });
}
self.onmessage = async ({ data }) => {
    try {
        const records = directory(data);
        const zip = await JSZip.loadAsync(data, { createFolders: false });
        const entries = Object.values(zip.files);
        if (entries.length !== records.length) fail('Повторювані або неоднозначні записи ZIP.');
        const out = new JSZip(), budget = { total: 0 };
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i], name = entry.name;
            if (!name || /[\x00-\x1f\\:]/.test(name) || name.startsWith('/') || name.split('/').includes('..') || (entry.unsafeOriginalName && entry.unsafeOriginalName !== name)) fail('Небезпечний шлях усередині ZIP.');
            // JSZip enumeration order can differ for integer-like names; metadata is checked below using the library's record.
            const actual = await unpack(entry, budget);
            if (entry._data && typeof entry._data.uncompressedSize === 'number' && actual.bytes.length !== entry._data.uncompressedSize) fail('Неправдивий розмір ZIP-запису.');
            if (entry._data && typeof entry._data.crc32 === 'number' && actual.crc !== (entry._data.crc32 >>> 0)) fail('Пошкоджені дані ZIP (CRC).');
            out.file(name, actual.bytes, { binary: true, dir: entry.dir, createFolders: false, compression: 'STORE' });
        }
        // Only verified, uncompressed entries reach Mammoth / the main thread.
        const buffer = await out.generateAsync({ type: 'arraybuffer', compression: 'STORE' });
        self.postMessage({ buffer }, [buffer]);
    } catch (err) { self.postMessage({ error: err.message || 'Не вдалося перевірити архів.' }); }
};
