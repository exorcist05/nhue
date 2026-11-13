// Sends the photos to the Next.js API route, which calls Gemini on the server.
export async function analyze({ front, left, right }) {
  const body = new FormData()
  body.append('front', front, 'front.jpg')
  if (left) body.append('left', left, 'left.jpg')
  if (right) body.append('right', right, 'right.jpg')

  let res
  try {
    res = await fetch('/api/analyze', { method: 'POST', body })
  } catch {
    throw new Error("Couldn't reach the nhue server. Check that it's running.")
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'The analysis failed. Try again.')
  }
  return data
}
