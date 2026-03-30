const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY

export async function aiGenerate(word, category) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 400,
      messages: [{
        role: 'system',
        content: 'You are a vocabulary assistant for English learners. Always respond with ONLY valid JSON, no markdown, no backticks, no explanation.'
      }, {
        role: 'user',
        content: `For the English word "${word}" (category: ${category}), generate:
1. IPA phonetic transcription
2. A clear, simple English definition (1-2 sentences)
3. A practical example sentence using the word
4. Another natural example sentence

JSON format: {"phonetic":"/...IPA.../","def":"...","ex":"...","sentence":"..."}`
      }]
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OpenAI error ${res.status}: ${err?.error?.message || res.statusText}`)
  }

  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content || ''
  if (!text) throw new Error('Empty response from AI')

  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
  return JSON.parse(clean)
}
