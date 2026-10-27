import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { SERVICE_NOTE } from "@/lib/service-note";
import { buildFiche, buildRecaps, type PictoKey, type SheetExtra, type SheetGuest } from "@/lib/service-sheet";
import { toPdfText } from "@/lib/pdf/text";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const BLUE = rgb(0.12, 0.55, 0.82);
const INK = rgb(0.1, 0.1, 0.1);
const MUTED = rgb(0.35, 0.35, 0.35);
const LINE = rgb(0.75, 0.75, 0.75);

function pdfText(value: string): string {
  return toPdfText(value);
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = pdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawPicto(page: PDFPage, key: PictoKey, x: number, y: number, size: number) {
  const meat = rgb(0.42, 0.32, 0.24);
  const cream = rgb(0.95, 0.93, 0.88);
  const green = rgb(0.35, 0.55, 0.32);
  const gold = rgb(0.72, 0.55, 0.2);
  if (key === "deux" || key === "une") {
    page.drawEllipse({
      x: x + size * 0.38,
      y: y + size * 0.16,
      xScale: size * 0.28,
      yScale: size * 0.08,
      borderColor: INK,
      borderWidth: 0.8,
    });
    const centers = key === "deux" ? [0.26, 0.5] : [0.38];
    for (const center of centers) {
      page.drawCircle({
        x: x + size * center,
        y: y + size * 0.4,
        size: size * 0.13,
        color: meat,
        borderColor: INK,
        borderWidth: 0.5,
      });
    }
    page.drawRectangle({
      x: x + size * 0.62,
      y: y + size * 0.22,
      width: size * 0.22,
      height: size * 0.34,
      borderColor: gold,
      borderWidth: 1,
      color: rgb(0.98, 0.92, 0.7),
    });
    return;
  }
  if (key === "salade") {
    page.drawEllipse({
      x: x + size * 0.5,
      y: y + size * 0.38,
      xScale: size * 0.34,
      yScale: size * 0.22,
      color: rgb(0.93, 0.95, 0.9),
      borderColor: INK,
      borderWidth: 0.8,
    });
    page.drawCircle({ x: x + size * 0.38, y: y + size * 0.46, size: size * 0.08, color: green });
    page.drawCircle({ x: x + size * 0.55, y: y + size * 0.5, size: size * 0.07, color: rgb(0.85, 0.45, 0.25) });
    page.drawCircle({ x: x + size * 0.66, y: y + size * 0.4, size: size * 0.06, color: rgb(0.95, 0.85, 0.35) });
    return;
  }
  if (key === "lasagne") {
    const layers = [0.18, 0.34, 0.5];
    layers.forEach((offset, index) => {
      page.drawRectangle({
        x: x + size * 0.18,
        y: y + size * offset,
        width: size * 0.64,
        height: size * 0.14,
        color: index === 1 ? rgb(0.75, 0.28, 0.22) : rgb(0.92, 0.78, 0.45),
        borderColor: INK,
        borderWidth: 0.6,
      });
    });
    return;
  }
  page.drawEllipse({
    x: x + size * 0.5,
    y: y + size * 0.28,
    xScale: size * 0.28,
    yScale: size * 0.16,
    color: cream,
    borderColor: INK,
    borderWidth: 0.8,
  });
  page.drawEllipse({
    x: x + size * 0.5,
    y: y + size * 0.48,
    xScale: size * 0.16,
    yScale: size * 0.1,
    color: rgb(0.55, 0.15, 0.22),
  });
}

function drawFooter(page: PDFPage, font: PDFFont, yStart: number) {
  const lines = wrap(SERVICE_NOTE, font, 9, PAGE_W - 80);
  let y = yStart;
  for (const line of lines) {
    page.drawText(line, { x: 40, y, size: 9, font, color: MUTED });
    y -= 12;
  }
}

export async function renderFichesPdf(input: {
  timeInfo: string;
  reservations: { referent: string; guests: SheetGuest[]; extras: SheetExtra[] }[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const paid = input.reservations.filter((reservation) => reservation.guests.length > 0 || reservation.extras.length > 0);

  if (paid.length === 0) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawText(pdfText(`${input.timeInfo} — aucune réservation payée`), {
      x: 40,
      y: PAGE_H - 80,
      size: 16,
      font: bold,
      color: INK,
    });
    return doc.save();
  }

  for (const reservation of paid) {
    const fiche = buildFiche({
      timeInfo: input.timeInfo,
      referent: reservation.referent,
      guests: reservation.guests,
      extras: reservation.extras,
    });
    const chunks: typeof fiche.rows[] = [];
    for (let i = 0; i < fiche.rows.length; i += 16) chunks.push(fiche.rows.slice(i, i + 16));
    chunks.forEach((rows, index) => {
      const page = doc.addPage([PAGE_W, PAGE_H]);
      page.drawText(pdfText(fiche.title), { x: 40, y: PAGE_H - 70, size: 22, font: bold, color: BLUE });
      page.drawText(pdfText(fiche.tablesLabel), { x: 40, y: PAGE_H - 100, size: 18, font: bold, color: BLUE });
      if (chunks.length > 1) {
        page.drawText(`${index + 1}/${chunks.length}`, { x: PAGE_W - 70, y: PAGE_H - 70, size: 10, font: regular, color: MUTED });
      }
      const headers = ["Place", "Repas", "Dessert", "Repas supplémentaire"];
      const widths = [70, 150, 80, 180];
      let x = 40;
      const headerY = PAGE_H - 140;
      headers.forEach((header, col) => {
        page.drawText(header, { x, y: headerY, size: 10, font: bold, color: INK });
        x += widths[col];
      });
      page.drawLine({
        start: { x: 40, y: headerY - 6 },
        end: { x: PAGE_W - 40, y: headerY - 6 },
        thickness: 1,
        color: INK,
      });
      rows.forEach((row, rowIndex) => {
        const y = headerY - 28 - rowIndex * 28;
        const cells = [row.place, row.meal, row.dessert, row.extra];
        let cellX = 40;
        cells.forEach((cell, col) => {
          page.drawText(pdfText(cell), { x: cellX, y, size: 11, font: regular, color: INK });
          cellX += widths[col];
        });
        page.drawLine({
          start: { x: 40, y: y - 8 },
          end: { x: PAGE_W - 40, y: y - 8 },
          thickness: 0.4,
          color: LINE,
        });
      });
      drawFooter(page, regular, 150);
    });
  }

  return doc.save();
}

export async function renderRecapPdf(input: {
  timeInfo: string;
  reservations: { guests: SheetGuest[]; extras: SheetExtra[] }[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const recaps = buildRecaps(input);

  if (recaps.length === 0) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    page.drawText(pdfText(`${input.timeInfo} — aucune table servie`), {
      x: 40,
      y: PAGE_H - 80,
      size: 16,
      font: bold,
      color: INK,
    });
    return doc.save();
  }

  for (const recap of recaps) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    const titleWidth = bold.widthOfTextAtSize(pdfText(recap.title), 22);
    page.drawText(pdfText(recap.title), {
      x: (PAGE_W - titleWidth) / 2,
      y: PAGE_H - 70,
      size: 22,
      font: bold,
      color: INK,
    });
    page.drawText("Parents", { x: 250, y: PAGE_H - 120, size: 14, font: bold, color: INK });
    page.drawText("Élève", { x: 400, y: PAGE_H - 120, size: 14, font: bold, color: INK });
    page.drawLine({
      start: { x: 330, y: PAGE_H - 140 },
      end: { x: 330, y: 160 },
      thickness: 1,
      color: INK,
    });

    recap.lines.forEach((line, index) => {
      const y = PAGE_H - 190 - index * 100;
      drawPicto(page, line.key, 48, y - 10, 56);
      page.drawText(String(line.parents), { x: 270, y: y + 8, size: 28, font: bold, color: INK });
      page.drawText(String(line.eleves), { x: 420, y: y + 8, size: 28, font: bold, color: INK });
    });
  }

  return doc.save();
}
