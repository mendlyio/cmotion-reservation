/**
 * Helvetica (pdf-lib) n'encode que le WinAnsi / Latin-1.
 * Les signes courants hors de cet encodage deviennent des équivalents ASCII
 * lisibles. Le reste est retiré, sans être remplacé par une espace.
 */
const READABLE: ReadonlyArray<readonly [string, string]> = [
  ["œ", "oe"],
  ["Œ", "OE"],
  ["æ", "ae"],
  ["Æ", "AE"],
  ["€", "EUR"],
  ["’", "'"],
  ["‘", "'"],
  ["ʼ", "'"],
  ["‚", "'"],
  ["“", '"'],
  ["”", '"'],
  ["„", '"'],
  ["«", '"'],
  ["»", '"'],
  ["‹", "'"],
  ["›", "'"],
  ["–", "-"],
  ["—", "-"],
  ["−", "-"],
  ["‐", "-"],
  ["‑", "-"],
  ["…", "..."],
  ["\u00A0", " "],
  ["\u202F", " "],
  ["\u2009", " "],
  ["\u2007", " "],
];

export function toPdfText(value: string): string {
  let text = value;
  for (const [from, to] of READABLE) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  return text.replace(/[^\u0020-\u00FF]/g, "");
}
