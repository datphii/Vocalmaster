// Default vocab is empty — users build their own vocabulary
export const defaultVocab = []

export const categories = [
  { key: 'all',        label: 'All',          color: '#94a3b8' },
  { key: 'noun',       label: 'Noun',         color: '#3b82f6' },
  { key: 'verb',       label: 'Verb',         color: '#ef4444' },
  { key: 'adjective',  label: 'Adjective',    color: '#f59e0b' },
  { key: 'adverb',     label: 'Adverb',       color: '#22c55e' },
  { key: 'phrase',     label: 'Phrase',       color: '#a855f7' },
  { key: 'idiom',      label: 'Idiom',        color: '#06b6d4' },
  { key: 'phrasal',    label: 'Phrasal Verb', color: '#ec4899' },
  { key: 'other',      label: 'Other',        color: '#78716c' },
]

export const catColor = c => categories.find(x => x.key === c)?.color || '#94a3b8'
