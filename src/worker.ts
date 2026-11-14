/**
 * Runs only for "/" (see run_worker_first in wrangler.jsonc); everything else is
 * served straight from the static assets.
 *
 * WordPress links pages by number, /?p=737 or /?page_id=737, and those links
 * live on in bookmarks and other sites. Cloudflare's _redirects cannot match a
 * query string, so they are redirected here, to the page each id belonged to.
 */
import ids from '../dist/_wp-ids.json'

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

const byId: Record<string, string> = ids

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const id = url.searchParams.get('p') ?? url.searchParams.get('page_id')
    const to = id ? byId[id] : undefined
    if (to) return Response.redirect(new URL(to, url.origin).toString(), 301)
    return env.ASSETS.fetch(request)
  },
}
