export function log(level: 'info' | 'error', message: string, data?: object) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...data }))
}

export function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
