/**
 * robots.txt, the sitemaps and _redirects. See src/lib/root-files.ts.
 */
import type { APIRoute } from 'astro'
import { rootFiles } from '../lib/root-files.ts'

export function getStaticPaths() {
  return Object.entries(rootFiles()).map(([file, { body, type }]) => ({ params: { file }, props: { body, type } }))
}

export const GET: APIRoute = ({ props }) =>
  new Response(props.body as string, { headers: { 'Content-Type': props.type as string } })
