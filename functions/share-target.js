// Cloudflare Pages Function: /share-target
// «Поділитися → AI Reader» потрапляє сюди лише тоді, коли service worker ще не керує сторінкою (перший запуск, очищені дані):
// зазвичай POST перехоплює sw.js. Файл без service worker передати застосунку нема як — просимо відкрити його ще раз;
// текст (до 2000 символів) передаємо в адресі.
export async function onRequestPost({ request }) {
    const base = new URL('/', request.url);
    try {
        const form = await request.formData();
        const field = (name) => String(form.get(name) || '').trim();
        const text = (field('text') || field('title')).slice(0, 2000);
        const hasFile = form.getAll('book').some(f => f && typeof f === 'object' && f.size > 0);
        if (hasFile) base.searchParams.set('shared', 'nofile');
        else if (text) { base.searchParams.set('shared', 'text'); base.searchParams.set('text', text); }
        else base.searchParams.set('shared', 'empty');
    } catch (e) {
        base.searchParams.set('shared', 'error');
    }
    return Response.redirect(base.toString(), 303);
}
export function onRequestGet({ request }) {
    return Response.redirect(new URL('/', request.url).toString(), 302);
}
