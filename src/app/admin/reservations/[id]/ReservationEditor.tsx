"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MEAL_OPTIONS, MealChoice } from "@/types";

interface GuestData {
  id: number;
  seatId: number;
  seatNumber: number;
  firstName: string;
  lastName: string;
  mealChoice: string;
  hasDessert: boolean;
  adminNotes: string;
}

interface ReservationEditorProps {
  reservationId: number;
  email: string;
  eventName: string;
  adminNotes: string;
  guests: GuestData[];
}

export function ReservationEditor({
  reservationId,
  email,
  eventName,
  adminNotes: initialNotes,
  guests: initialGuests,
}: ReservationEditorProps) {
  const router = useRouter();
  const [guests, setGuests] = useState<GuestData[]>(initialGuests);
  const [adminNotes, setAdminNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);

  const handleGuestChange = (index: number, field: string, value: string | boolean | null) => {
    const newGuests = [...guests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setGuests(newGuests);
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNotes,
          guests: guests.map((g) => ({
            id: g.id,
            firstName: g.firstName,
            lastName: g.lastName,
            mealChoice: g.mealChoice,
            hasDessert: g.hasDessert,
            adminNotes: g.adminNotes,
          })),
          sendEmail: true,
        }),
      });

      if (res.ok) {
        toast.success("Réservation mise à jour et email envoyé");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la mise à jour");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Convives</h2>
        <Button onClick={handleSave} disabled={loading} size="sm">
          {loading ? "Sauvegarde..." : "Sauvegarder et notifier"}
        </Button>
      </div>

      <div className="space-y-4">
        {guests.map((guest, i) => (
          <div
            key={guest.id}
            className="border rounded-lg p-4 bg-slate-50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-600">
                Siège {guest.seatNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Prénom</Label>
                <Input
                  value={guest.firstName}
                  onChange={(e) =>
                    handleGuestChange(i, "firstName", e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Nom</Label>
                <Input
                  value={guest.lastName}
                  onChange={(e) =>
                    handleGuestChange(i, "lastName", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-xs">Repas</Label>
                <Select
                  value={guest.mealChoice}
                  onValueChange={(v) =>
                    handleGuestChange(i, "mealChoice", v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_OPTIONS.map((meal) => (
                      <SelectItem key={meal.value} value={meal.value}>
                        {meal.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Dessert</Label>
                <div className="mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guest.hasDessert}
                      onChange={(e) =>
                        handleGuestChange(
                          i,
                          "hasDessert",
                          e.target.checked
                        )
                      }
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Tiramisu</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Label className="text-xs">Note admin (convive)</Label>
              <Input
                value={guest.adminNotes}
                onChange={(e) =>
                  handleGuestChange(i, "adminNotes", e.target.value)
                }
                placeholder="Note interne..."
                className="text-sm"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t">
        <Label className="text-sm font-medium">
          Notes admin (réservation)
        </Label>
        <Textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Notes internes sur cette réservation..."
          className="mt-2"
          rows={3}
        />
      </div>
    </div>
  );
}
