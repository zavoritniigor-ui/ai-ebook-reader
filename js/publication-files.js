/* Bounded publication I/O. Download streams go to origin-private disk where
 * supported; Response.blob is the browser-managed fallback, never a JS chunk list.
 * These files are temporary staging files; the shelf owns the durable copy. */
const publicationMetadata = new WeakMap();
const publicationStagedFiles = new WeakMap();
function publicationFile(blob, name, options) {
    const file = new File([blob], name, options);
    if (publicationStagedFiles.has(blob)) publicationStagedFiles.set(file, publicationStagedFiles.get(blob));
    return file;
}
async function releasePublicationStaging(file) {
    const staged = publicationStagedFiles.get(file);
    if (!staged) return;
    publicationStagedFiles.delete(file);
    await staged.dir.removeEntry(staged.name).catch(() => {});
}
let publicationTempDirPromise;
async function publicationTempDir() {
    if (!navigator.storage?.getDirectory || !navigator.locks) return null;
    if (!publicationTempDirPromise) publicationTempDirPromise = navigator.storage.getDirectory()
        .then(root => root.getDirectoryHandle('publication-downloads', { create: true }))
        .catch(err => { publicationTempDirPromise = null; throw err; });
    return publicationTempDirPromise;
}
async function readPublicationResponse(res, expectedSize = 0, onProgress = () => {}) {
    if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
    await publicationStagingReady;
    const total = Number(res.headers.get('content-length')) || expectedSize;
    const estimate = await navigator.storage?.estimate?.().catch(() => null);
    if (estimate && total && total > estimate.quota - estimate.usage) {
        await res.body.cancel().catch(() => {}); throw new Error(t('publicationStorageFull'));
    }
    let got = 0;
    const progress = new TransformStream({ transform(chunk, controller) {
        got += chunk.byteLength; onProgress(got, total); controller.enqueue(chunk);
    } });
    const stream = res.body.pipeThrough(progress);
    const dir = await publicationTempDir();
    if (!dir) {
        const blob = await new Response(stream).blob();
        if (total && blob.size !== total) throw new Error(t('publicationIncomplete'));
        onProgress(blob.size, total || blob.size); return blob;
    }
    const name = Date.now() + '-' + crypto.randomUUID();
    try {
        const handle = await dir.getFileHandle(name, { create: true });
        if (typeof handle.createWritable !== 'function') {
            await dir.removeEntry(name);
            const blob = await new Response(stream).blob();
            if (total && blob.size !== total) throw new Error(t('publicationIncomplete'));
            onProgress(blob.size, total || blob.size); return blob;
        }
        await stream.pipeTo(await handle.createWritable());
        const blob = await handle.getFile();
        if (total && blob.size !== total) throw new Error(t('publicationIncomplete'));
        onProgress(blob.size, total || blob.size);
        publicationStagedFiles.set(blob, { dir, name });
        return blob;
    } catch (err) {
        await dir.removeEntry(name).catch(() => {});
        throw err;
    }
}
// Staging files can back live Files in this session. Remove only files from
// previous sessions, before accepting new downloads (not while a book uses one).
async function clearPublicationStaging() {
    try {
        const dir = await publicationTempDir();
        if (dir) for await (const [name] of dir.entries()) await dir.removeEntry(name).catch(() => {});
    } catch (e) { /* the next download reports storage failures */ }
}
const publicationStagingReady = (async () => {
    // Other tabs may still be reading their staging Files. An origin-wide shared
    // lease keeps cleanup out until the last reader tab has closed.
    if (!navigator.locks) return;
    await navigator.locks.request('reader-publication-staging', { ifAvailable: true }, async lock => {
        if (lock) await clearPublicationStaging();
    });
    await new Promise(resolve => {
        navigator.locks.request('reader-publication-staging', { mode: 'shared' }, async () => {
            resolve(); await new Promise(() => {});
        }).catch(resolve);
    });
})();
