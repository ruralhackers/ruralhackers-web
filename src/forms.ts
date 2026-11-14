/**
 * The two WPForms forms, answered without WordPress.
 *
 * The mirrored pages still run WPForms' own JavaScript, which posts each form
 * to /wp-admin/admin-ajax.php (action=wpforms_submit) and expects WPForms' json
 * back. src/worker.ts routes that url here, so the forms look and behave exactly
 * as they did: same validation, same spinner, same confirmation in place of the
 * form. What changes is where the message goes: an email to the team, through
 * Resend, with Reply-To set to whoever wrote.
 *
 * Before submitting, WPForms also asks the same url for a fresh form token
 * (action=wpforms_get_token) and refuses to submit if that fails, so that is
 * answered too. The token was WordPress's own anti-spam check; nothing verifies
 * it here, it only has to exist.
 *
 * Field 4 of both forms is WPForms' honeypot: hidden by css, with a nonsense
 * label ("or Name Comment"). A person never fills it in; a bot that does gets
 * the same confirmation as everyone else, and nothing is sent.
 */

export interface FormsEnv {
  /** Worker secret. Never in code or config: `wrangler secret put RESEND_API_KEY`. */
  RESEND_API_KEY?: string
}

const TEAM = 'hello@ruralhackers.com'
/** out.ruralhackers.com carries Resend's DKIM record in the zone. */
const FROM = 'Rural Hackers web <web@out.ruralhackers.com>'
const RESEND = 'https://api.resend.com/emails'

interface Field {
  id: string
  label: string
  required: boolean
  /** WPForms' name field splits into [first] and [last]. */
  parts?: readonly string[]
  email?: boolean
}

interface Form {
  name: string
  fields: readonly Field[]
  honeypot: string
  /** WPForms' default confirmation, which both forms used. */
  confirmation: string
}

const CONFIRMATION = 'Thanks for contacting us! We will be in touch with you shortly.'

export const FORMS: Readonly<Record<string, Form>> = {
  '526': {
    name: 'Contact',
    honeypot: '4',
    confirmation: CONFIRMATION,
    fields: [
      { id: '1', label: 'Name', required: true },
      { id: '2', label: 'Email', required: true, email: true },
      { id: '3', label: 'Comment or Message', required: false },
    ],
  },
  '716': {
    name: 'Hacker Days',
    honeypot: '4',
    confirmation: CONFIRMATION,
    fields: [
      { id: '1', label: 'Name', required: true, parts: ['first', 'last'] },
      { id: '2', label: 'Email', required: true, email: true },
      { id: '3', label: 'Why would you like to be part of Hacker Days?', required: true },
      { id: '7', label: 'How would you like to contribute?', required: true },
    ],
  },
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })

/**
 * Always 200, like WordPress: WPForms only reads the json of a successful
 * response; on any other status it shows nothing at all.
 */
const failure = (message: string, status = 200) =>
  json({ success: false, data: { errors: { general: `<p>${message}</p>` } } }, status)

const escapeHtml = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const value = (data: FormData, field: Field) =>
  (field.parts
    ? field.parts.map((p) => String(data.get(`wpforms[fields][${field.id}][${p}]`) ?? '').trim()).join(' ')
    : String(data.get(`wpforms[fields][${field.id}]`) ?? '')
  ).trim()

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type Sender = (message: {
  subject: string
  text: string
  html: string
  replyTo: string
}) => Promise<boolean>

export const resendSender =
  (env: FormsEnv): Sender =>
  async ({ subject, text, html, replyTo }) => {
    if (!env.RESEND_API_KEY) return false
    const res = await fetch(RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [TEAM], reply_to: replyTo, subject, text, html }),
    })
    if (!res.ok) console.error('resend', res.status, await res.text())
    return res.ok
  }

/** Answers one post from WPForms' JavaScript: a token request or a submission. */
export async function handleWpformsAjax(request: Request, send: Sender): Promise<Response> {
  let data: FormData
  try {
    data = await request.formData()
  } catch {
    return failure('The form could not be read. Please try again.', 400)
  }
  const action = data.get('action')
  if (action === 'wpforms_get_token') {
    if (!FORMS[String(data.get('formId') ?? '')]) return json({ success: false }, 400)
    return json({
      success: true,
      data: { token: crypto.randomUUID().replaceAll('-', ''), time_token: String(Math.floor(Date.now() / 1000)) },
    })
  }
  if (action !== 'wpforms_submit') return json({ success: false, data: 'Unknown action.' }, 400)

  const formId = String(data.get('wpforms[id]') ?? '')
  const form = FORMS[formId]
  if (!form) return failure('This form no longer exists.', 400)

  const confirmed = json({
    success: true,
    data: {
      confirmation: `<div class="wpforms-confirmation-container-full wpforms-confirmation-scroll" id="wpforms-confirmation-${formId}"><p>${form.confirmation}</p></div>`,
    },
  })

  if (String(data.get(`wpforms[fields][${form.honeypot}]`) ?? '').trim()) return confirmed

  const values = form.fields.map((f) => ({ field: f, value: value(data, f) }))
  const missing = values.filter((v) => v.field.required && !v.value)
  if (missing.length) return failure(`Please fill in: ${missing.map((m) => m.field.label).join(', ')}.`)
  const email = values.find((v) => v.field.email)!.value
  if (!EMAIL.test(email)) return failure('Please enter a valid email address.')

  const name = values.find((v) => v.field.id === '1')!.value
  const page = String(data.get('page_url') ?? '')
  const subject = `${form.name}: ${name}`
  const text =
    values.map((v) => `${v.field.label}:\n${v.value || '—'}`).join('\n\n') + (page ? `\n\nSent from ${page}` : '')
  const html =
    `<h2 style="font-family:sans-serif">${escapeHtml(form.name)}</h2>` +
    values
      .map(
        (v) =>
          `<p style="font-family:sans-serif"><strong>${escapeHtml(v.field.label)}</strong><br>${escapeHtml(v.value || '—').replaceAll('\n', '<br>')}</p>`,
      )
      .join('') +
    (page ? `<p style="font-family:sans-serif;color:#666">Sent from ${escapeHtml(page)}</p>` : '')

  const sent = await send({ subject, text, html, replyTo: email })
  if (!sent) return failure(`Your message could not be sent. Please write to us at ${TEAM}.`)
  return confirmed
}
