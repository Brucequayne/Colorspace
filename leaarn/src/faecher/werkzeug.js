// ===== faecher/werkzeug.js · Hilfen für Aufgaben-Erzeuger =====
export function shuffle(a, R) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)), t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
export function pick(a, R) { return a[Math.floor(R() * a.length)]; }
export function zahl(a, b, R) { return a + Math.floor(R() * (b - a + 1)); }
