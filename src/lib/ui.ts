import type { Locale } from './i18n.ts'

/**
 * Interface strings, as opposed to content.
 *
 * The nav labels, the skip link, the footer line, the two index headings: none of
 * these live in a content collection, so without a dictionary a translated page
 * would come out with Spanish prose under an English chrome.
 *
 * Galician needs a native speaker's eye. It was written here rather than left in
 * English, because half-translated is worse than either, but it is not reviewed.
 */
export interface UiStrings {
  skipToContent: string
  menu: string
  language: string
  mainNav: string
  homeLabel: string
  progress: string
  blog: string
  backToBlog: string
  morePosts: string
  followUs: string
  designedWith: string
  copyright: string
  learnMore: string
  contact: string
  volunteering: string
  residencies: string
  writtenBy: string
  in: string
  /** Form fields. Both forms are shared components, so they need these too. */
  formName: string
  formEmail: string
  formMessage: string
  formSubmit: string
  formHoneypot: string
  formMotivation: string
  formContribution: string
}

const en: UiStrings = {
  skipToContent: 'Skip to content',
  menu: 'Menu',
  language: 'Language',
  mainNav: 'Main',
  homeLabel: 'Rural Hackers — home',
  progress: 'Progress',
  blog: 'Blog',
  backToBlog: 'Back to the blog',
  morePosts: 'More posts',
  followUs: 'Follow us in real life',
  designedWith: 'Designed with ❤️ from Anceu village',
  copyright: 'Copyright',
  learnMore: 'Learn more',
  contact: 'Contact',
  volunteering: 'Volunteering',
  residencies: 'Residencies',
  writtenBy: 'Written by',
  in: 'in',
  formName: 'Name',
  formEmail: 'Email',
  formMessage: 'Comment or Message',
  formSubmit: 'Submit',
  formHoneypot: 'Do not fill this in',
  formMotivation: 'Why would you like to be part of Hacker Days',
  formContribution: 'How would you like to contribute?',
}

const es: UiStrings = {
  skipToContent: 'Saltar al contenido',
  menu: 'Menú',
  language: 'Idioma',
  mainNav: 'Principal',
  homeLabel: 'Rural Hackers — inicio',
  progress: 'Trayectoria',
  blog: 'Blog',
  backToBlog: 'Volver al blog',
  morePosts: 'Más entradas',
  followUs: 'Vernos en persona',
  designedWith: 'Hecho con ❤️ desde la aldea de Anceu',
  copyright: 'Copyright',
  learnMore: 'Saber más',
  contact: 'Contacto',
  volunteering: 'Voluntariado',
  residencies: 'Residencias',
  writtenBy: 'Escrito por',
  in: 'en',
  formName: 'Nombre',
  formEmail: 'Correo electrónico',
  formMessage: 'Comentario o mensaje',
  formSubmit: 'Enviar',
  formHoneypot: 'No rellenes esto',
  formMotivation: '¿Por qué te gustaría formar parte de Hacker Days',
  formContribution: '¿Cómo te gustaría contribuir?',
}

const gl: UiStrings = {
  skipToContent: 'Ir ao contido',
  menu: 'Menú',
  language: 'Idioma',
  mainNav: 'Principal',
  homeLabel: 'Rural Hackers — inicio',
  progress: 'Traxectoria',
  blog: 'Blog',
  backToBlog: 'Volver ao blog',
  morePosts: 'Máis entradas',
  followUs: 'Vernos en persoa',
  designedWith: 'Feito con ❤️ desde a aldea de Anceu',
  copyright: 'Copyright',
  learnMore: 'Saber máis',
  contact: 'Contacto',
  volunteering: 'Voluntariado',
  residencies: 'Residencias',
  writtenBy: 'Escrito por',
  in: 'en',
  formName: 'Nome',
  formEmail: 'Correo electrónico',
  formMessage: 'Comentario ou mensaxe',
  formSubmit: 'Enviar',
  formHoneypot: 'Non enchas isto',
  formMotivation: 'Por que che gustaría formar parte de Hacker Days',
  formContribution: 'Como che gustaría contribuír?',
}

const STRINGS: Readonly<Record<Locale, UiStrings>> = { en, es, gl }

export function ui(locale: Locale): UiStrings {
  return STRINGS[locale]
}
