/**
 * Runs only for the paths in run_worker_first (wrangler.jsonc); everything else
 * is served straight from the static assets.
 *
 * - "/": WordPress links pages by number, /?p=737 or /?page_id=737, and those
 *   links live on in bookmarks and other sites. Cloudflare's _redirects cannot
 *   match a query string, so they are redirected here, to the page each id was.
 * - "/wp-admin/admin-ajax.php": where the WPForms forms post. See src/forms.ts.
 */
import ids from '../dist/_wp-ids.json'
import { handleWpformsAjax, resendSender, type FormsEnv } from './forms.ts'

interface Env extends FormsEnv {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

const byId: Record<string, string> = ids

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/wp-admin/admin-ajax.php') {
      if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } })
      return handleWpformsAjax(request, resendSender(env))
    }

    const id = url.searchParams.get('p') ?? url.searchParams.get('page_id')
    const to = id ? byId[id] : undefined
    if (to) return Response.redirect(new URL(to, url.origin).toString(), 301)
    return env.ASSETS.fetch(request)
  },
}
