// Copyright (c) 2026 Zavoritnii Ihor. All rights reserved. Proprietary software, see LICENSE.
// Copying, modification, distribution or commercial use without written permission is prohibited.
// Cloudflare Pages Function for «/» only (the app's start page; static files never come here).
// web.ai-ebook-reader.uk is the reading proxy's host (functions/p/[[path]].js): the exercise sites shown there run their own
// and their advertisers' scripts on it. Opened at its root it used to show the whole app too, and whatever the app saved
// there (books, AI keys) sat next to those scripts. Now its root sends to the app's own address; every other host gets the
// start page unchanged.
export const READING_PROXY_HOST = 'web.ai-ebook-reader.uk';
export const APP_ADDRESS = 'https://ai-ebook-reader.uk/';

export async function onRequest({ request, next }) {
    if (new URL(request.url).hostname === READING_PROXY_HOST) {
        return new Response(null, { status: 302, headers: { location: APP_ADDRESS, 'cache-control': 'no-store' } });
    }
    return next();
}
