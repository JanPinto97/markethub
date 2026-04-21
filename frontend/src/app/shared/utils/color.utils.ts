export function getUsernameColor(name: string): string {
  const src = name || '';
  let hash = 0;
  for (let i = 0; i < src.length; i++) {
    hash = src.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function getInitial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}
