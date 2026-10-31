import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingSchema, parseReferentUpdate, type BookingInput } from "./booking-schema";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    eventId: 1,
    seatIds: [10],
    guests: [
      {
        seatId: 10,
        firstName: "Luc",
        lastName: "Martin",
        mealChoice: "lasagne",
        hasDessert: false,
      },
    ],
    referentLastName: " Dupont ",
    referentFirstName: " Marie ",
    email: "parent@example.com",
    phone: "+32470123456",
    ...overrides,
  };
}

describe("validation de réservation", () => {
  it("exige le nom et le prénom de l'élève référent, séparés", () => {
    const parsed = bookingSchema.safeParse(payload());
    assert.equal(parsed.success, true);
    if (!parsed.success) return;
    assert.equal(parsed.data.referentLastName, "Dupont");
    assert.equal(parsed.data.referentFirstName, "Marie");
    assert.equal(parsed.data.guests[0].firstName, "Luc");
    assert.equal(parsed.data.guests[0].lastName, "Martin");
  });

  it("refuse l'ancienne case unique et un seul des deux nouveaux champs", () => {
    const legacy = payload();
    delete (legacy as { referentLastName?: string }).referentLastName;
    delete (legacy as { referentFirstName?: string }).referentFirstName;
    (legacy as { referentStudent?: string }).referentStudent = "Dupont Marie";
    assert.equal(bookingSchema.safeParse(legacy).success, false);
    assert.equal(bookingSchema.safeParse(payload({ referentLastName: "  " })).success, false);
    assert.equal(bookingSchema.safeParse(payload({ referentFirstName: "" })).success, false);
    assert.equal(bookingSchema.safeParse(payload({ referentLastName: "Du\u0000pont" })).success, false);
  });

  it("laisse le prénom et le nom des convives séparés", () => {
    const missingGuestLastName = payload();
    delete (missingGuestLastName.guests[0] as { lastName?: string }).lastName;
    const missingGuestFirstName = payload();
    delete (missingGuestFirstName.guests[0] as { firstName?: string }).firstName;
    assert.equal(bookingSchema.safeParse(missingGuestLastName).success, false);
    assert.equal(bookingSchema.safeParse(missingGuestFirstName).success, false);

    const names: BookingInput = bookingSchema.parse(payload());
    assert.equal(names.guests[0].firstName, "Luc");
    assert.equal(names.guests[0].lastName, "Martin");
    assert.equal("referentStudent" in names, false);
  });

  it("n'impose le référent à l'édition que lorsque les champs sont envoyés", () => {
    assert.deepEqual(parseReferentUpdate({}), { ok: true, update: null });
    const updated = parseReferentUpdate({ referentLastName: " Martin ", referentFirstName: "Lucie" });
    assert.deepEqual(updated, {
      ok: true,
      update: { referentLastName: "Martin", referentFirstName: "Lucie" },
    });
    const missing = parseReferentUpdate({ referentLastName: "Martin" });
    assert.equal(missing.ok, false);
    if (missing.ok) return;
    assert.match(missing.error, /nom et le prénom/i);
  });
});
