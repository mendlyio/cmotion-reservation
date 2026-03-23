"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEAL_OPTIONS, DESSERT_PRICE, MealChoice, SeatFormData } from "@/types";

interface GuestFormProps {
  index: number;
  seatId: number;
  seatLabel: string;
  data: SeatFormData;
  isVip: boolean;
  onChange: (data: SeatFormData) => void;
}

export function GuestForm({
  index,
  seatId,
  seatLabel,
  data,
  isVip,
  onChange,
}: GuestFormProps) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <h4 className="font-semibold text-sm text-slate-700 mb-3">
        Convive {index + 1}{" "}
        <span className="text-slate-400 font-normal">— {seatLabel}</span>
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor={`first-${seatId}`} className="text-xs">
            Prénom
          </Label>
          <Input
            id={`first-${seatId}`}
            value={data.firstName}
            onChange={(e) => onChange({ ...data, firstName: e.target.value })}
            placeholder="Prénom"
            required
          />
        </div>
        <div>
          <Label htmlFor={`last-${seatId}`} className="text-xs">
            Nom
          </Label>
          <Input
            id={`last-${seatId}`}
            value={data.lastName}
            onChange={(e) => onChange({ ...data, lastName: e.target.value })}
            placeholder="Nom"
            required
          />
        </div>
      </div>

      <div className="mt-3">
        <Label className="text-xs">Choix du plat</Label>
        <Select
          value={data.mealChoice}
          onValueChange={(v) =>
            onChange({ ...data, mealChoice: v as MealChoice })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir un plat" />
          </SelectTrigger>
          <SelectContent>
            {MEAL_OPTIONS.map((meal) => (
              <SelectItem key={meal.value} value={meal.value}>
                {meal.label} — {(meal.price / 100).toFixed(0)}€
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isVip && (
        <div className="mt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.hasDessert}
              onChange={(e) =>
                onChange({ ...data, hasDessert: e.target.checked })
              }
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">
              Tiramisu (+{(DESSERT_PRICE / 100).toFixed(2)}€)
            </span>
          </label>
        </div>
      )}

      {isVip && (
        <p className="text-xs text-amber-600 mt-2">
          ★ VIP : Verre de bulles, zakouski et dessert inclus
        </p>
      )}
    </div>
  );
}
