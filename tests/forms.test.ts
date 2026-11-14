import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { handleWpformsAjax, FORMS, type Sender } from '../src/forms.ts'

/** A submission as WPForms' JavaScript sends it: the form's own fields plus action. */
const post = (fields: Record<string, string>, action = 'wpforms_submit') => {
  const body = new FormData()
  body.append('action', action)
  for (const [k, v] of Object.entries(fields)) body.append(k, v)
  return new Request('https://ruralhackers.com/wp-admin/admin-ajax.php', { method: 'POST', body })
}

const capture = () => {
  const sent: Parameters<Sender>[0][] = []
  const send: Sender = async (m) => (sent.push(m), true)
  return { sent, send }
}

const contact = {
  'wpforms[id]': '526',
  'wpforms[fields][1]': 'Rosario',
  'wpforms[fields][2]': 'rosario@example.com',
  'wpforms[fields][3]': 'Hello\n<b>there</b>',
  'wpforms[fields][4]': '',
  page_url: 'https://ruralhackers.com/contact/',
}

describe('WPForms submissions', () => {
  it('emails the team and answers with the confirmation WPForms shows in place of the form', async () => {
    const { sent, send } = capture()
    const res = await handleWpformsAjax(post(contact), send)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.confirmation).toContain('id="wpforms-confirmation-526"')
    expect(sent).toHaveLength(1)
    expect(sent[0]!.subject).toBe('Contact: Rosario')
    expect(sent[0]!.replyTo).toBe('rosario@example.com')
    expect(sent[0]!.html).toContain('&lt;b&gt;there&lt;/b&gt;')
    expect(sent[0]!.html).not.toContain('<b>there</b>')
  })

  it('joins first and last name on the Hacker Days form', async () => {
    const { sent, send } = capture()
    await handleWpformsAjax(
      post({
        'wpforms[id]': '716',
        'wpforms[fields][1][first]': 'Ana',
        'wpforms[fields][1][last]': 'Lagun',
        'wpforms[fields][2]': 'ana@example.com',
        'wpforms[fields][3]': 'Because',
        'wpforms[fields][7]': 'Cooking',
      }),
      send,
    )
    expect(sent[0]!.subject).toBe('Hacker Days: Ana Lagun')
  })

  it('confirms a filled honeypot but sends nothing', async () => {
    const { sent, send } = capture()
    const res = await handleWpformsAjax(post({ ...contact, 'wpforms[fields][4]': 'spam' }), send)
    expect((await res.json()).success).toBe(true)
    expect(sent).toHaveLength(0)
  })

  it('rejects missing required fields and bad emails in WPForms\' error format', async () => {
    const { sent, send } = capture()
    const missing = await (await handleWpformsAjax(post({ ...contact, 'wpforms[fields][1]': '' }), send)).json()
    expect(missing.success).toBe(false)
    expect(missing.data.errors.general).toContain('Name')
    const bad = await (await handleWpformsAjax(post({ ...contact, 'wpforms[fields][2]': 'nope' }), send)).json()
    expect(bad.data.errors.general).toContain('valid email')
    expect(sent).toHaveLength(0)
  })

  it('says so, with an address to write to, when the email cannot be sent', async () => {
    const res = await handleWpformsAjax(post(contact), async () => false)
    // 200, or WPForms would not show the message at all
    expect(res.status).toBe(200)
    expect((await res.json()).data.errors.general).toContain('hello@ruralhackers.com')
  })

  it('hands WPForms a fresh token, which it insists on before submitting', async () => {
    const res = await handleWpformsAjax(post({ formId: '526' }, 'wpforms_get_token'), async () => true)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.token).toMatch(/^[0-9a-f]{32}$/)
    expect(Number(body.data.time_token)).toBeGreaterThan(1_700_000_000)
  })

  it('knows every form on the mirrored pages, and which field is the honeypot', () => {
    for (const page of ['contact', 'hacker-days']) {
      const html = readFileSync(`mirror/pages/${page}/index.html`, 'utf8')
      const id = /data-formid="(\d+)"/.exec(html)![1]!
      const form = FORMS[id]!
      expect(form).toBeDefined()
      for (const f of form.fields) expect(html).toContain(`wpforms[fields][${f.id}]`)
      // WPForms names the honeypot field in its settings: "hn_data":{"526":4}
      expect(html).toContain(`"hn_data":{"${id}":${form.honeypot}}`)
    }
  })
})
