export function randomId(): string {
  // Fallback simple que no depende de crypto (funciona en HTTP)
  const timestamp = Date.now().toString(16);
  const randomPart = Math.random().toString(16).slice(2, 18);
  return `${timestamp}-${randomPart}`;
}
