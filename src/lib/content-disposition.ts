/**
 * En-tête de téléchargement compatible HTTP.
 * `filename` reste en ASCII (accents retirés, tirets longs et apostrophes
 * deviennent des tirets). `filename*` garde le nom d'origine en UTF-8.
 */
export function contentDisposition(filename: string): string {
  const ascii = asciiFilename(filename);
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function asciiFilename(filename: string): string {
  const match = filename.match(/(\.[A-Za-z0-9]{1,8})$/);
  const extension = match?.[1].toLowerCase() ?? "";
  const base = match ? filename.slice(0, -match[1].length) : filename;
  const slug = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${slug || "export"}${extension}`;
}
