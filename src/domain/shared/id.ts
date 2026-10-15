export function newId(): string {
  return crypto.randomUUID();
}

/** Hash FNV-1a 32 bits → identifiant court et stable (ex : occurrences importées). */
export function stableHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
