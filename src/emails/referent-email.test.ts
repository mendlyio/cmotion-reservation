import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderConfirmationEmail } from "./ConfirmationEmail";
import { renderUpdateEmail } from "./ReservationUpdateEmail";

const base = {
  reservationId: 12,
  eventName: "Disney Show",
  eventDate: "2026-12-05",
  timeInfo: "18h00",
  totalAmount: 2500,
  guests: [
    { firstName: "Luc", lastName: "Martin", mealChoice: "lasagne", hasDessert: false },
  ],
};

describe("e-mails et élève référent", () => {
  it("détaille le nom et le prénom dans la confirmation, sans fusionner les convives", () => {
    const html = renderConfirmationEmail({
      ...base,
      referentStudent: "Dupont Marie",
      referentLastName: "Dupont",
      referentFirstName: "Marie",
    });
    assert.match(html, /Nom de l(?:'|&#39;)élève référent/);
    assert.match(html, /Prénom de l(?:'|&#39;)élève référent/);
    assert.match(html, /Dupont/);
    assert.match(html, /Marie/);
    assert.equal(html.includes(">Élève référent<"), false);
    assert.match(html, /Luc Martin/);
  });

  it("affiche l'ancienne saisie unique si le nom n'a pas encore été séparé", () => {
    const html = renderConfirmationEmail({
      ...base,
      referentStudent: "Pere Carly",
      referentLastName: null,
      referentFirstName: null,
    });
    assert.match(html, />Élève référent</);
    assert.match(html, /Pere Carly/);
    assert.equal(html.includes("Prénom de l'élève référent"), false);
  });

  it("reprend le référent dans l'e-mail de mise à jour", () => {
    const html = renderUpdateEmail({
      reservationId: 12,
      eventName: "Disney Show",
      eventDate: "2026-12-05",
      timeInfo: "18h00",
      changes: ["Élève référent : Pere Carly → Carly Pere"],
      referentStudent: "Carly Pere",
      referentLastName: "Carly",
      referentFirstName: "Pere",
      guests: base.guests,
    });
    assert.match(html, /Nom de l(?:'|&#39;)élève référent/);
    assert.match(html, /Prénom de l(?:'|&#39;)élève référent/);
    assert.match(html, /Carly/);
    assert.match(html, /Pere/);
    assert.match(html, /Luc Martin/);
    assert.match(html, /Pere Carly → Carly Pere/);
  });
});
