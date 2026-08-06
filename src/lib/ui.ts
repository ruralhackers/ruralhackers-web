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
}

const STRINGS: Readonly<Record<Locale, UiStrings>> = { en, es, gl }

export function ui(locale: Locale): UiStrings {
  return STRINGS[locale]
}
