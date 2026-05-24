export function formatBytes(b: number): string {
  if (b > 1e9) return `${(b / 1e9).toFixed(1)} GB`
  if (b > 1e6) return `${(b / 1e6).toFixed(0)} MB`
  return `${Math.round(b / 1e3)} KB`
}
