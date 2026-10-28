import type { Lang, Localized, State } from '../domain/types';
import { en } from './en';
import { he } from './he';
import type { Messages } from './messages';

export type { ChurnReasonInput, Messages, SuggestionInput } from './messages';

export const LANGS: readonly Lang[] = ['he', 'en'];

export function messages(lang: Lang): Messages {
  return lang === 'he' ? he : en;
}

/** The message pack for the language the state is set to. */
export const msgs = (s: State): Messages => messages(s.prefs.lang);

/** Pick the text for the state's language. */
export const loc = (s: State, text: Localized): string => text[s.prefs.lang];
