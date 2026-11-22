"use client";

import { type FieldError, type UseFormRegisterReturn } from "react-hook-form";
import type { ScoreRange } from "./scoring";

const scores = [1, 2, 3, 4, 5];
const hours = Array.from({ length: 24 }, (_, hour) => hour);

export function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function BaseScoreField({ input, optional = false, error }: {
  input: UseFormRegisterReturn; optional?: boolean; error?: FieldError;
}) {
  return <label className="field">Osnovna ocena
    <select {...input} defaultValue="" className="control" aria-invalid={!!error} required={!optional}>
      <option value="" disabled={!optional}>{optional ? "Bez osnovne ocene" : "Izaberite ocenu"}</option>
      {scores.map(score => <option key={score} value={score}>{score}</option>)}
    </select>
    {error && <span role="alert">Izaberite ocenu od 1 do 5.</span>}
  </label>;
}

export function TimeRangeFields({ ranges, register, error }: {
  ranges: { fields: { id: string }[]; append: (value: ScoreRange) => void; remove: (index: number) => void };
  register: (name: `timeRanges.${number}.${keyof ScoreRange}`, options: { valueAsNumber: true }) => UseFormRegisterReturn;
  error?: string;
}) {
  const { fields, append, remove } = ranges;
  return <fieldset className="foods-field">
    <legend>Vremenska pravila <span>(opciono)</span></legend>
    <p className="field-help">Vreme je lokalno. Početni sat je uključen, krajnji je isključen. Kraj pre početka prelazi preko ponoći.</p>
    {fields.map((range, index) => <fieldset key={range.id} className="score-range">
      <legend>Interval {index + 1}</legend>
      <div className="score-range-fields">
        <label className="field">Od
          <select {...register(`timeRanges.${index}.startHour`, { valueAsNumber: true })} className="control">
            {hours.map(hour => <option key={hour} value={hour}>{formatHour(hour)}</option>)}
          </select>
        </label>
        <label className="field">Do
          <select {...register(`timeRanges.${index}.endHour`, { valueAsNumber: true })} className="control">
            {hours.map(hour => <option key={hour} value={hour}>{formatHour(hour)}</option>)}
          </select>
        </label>
        <label className="field">Ocena
          <select {...register(`timeRanges.${index}.score`, { valueAsNumber: true })} className="control">
            {scores.map(score => <option key={score} value={score}>{score}</option>)}
          </select>
        </label>
      </div>
      <button type="button" className="secondary" aria-label={`Ukloni interval ${index + 1}`} onClick={() => remove(index)}>Ukloni</button>
    </fieldset>)}
    {error && <p role="alert" className="catalog-error">{error}</p>}
    {fields.length < 24 && <button type="button" className="secondary add-range"
      onClick={() => append({ startHour: 4, endHour: 12, score: 3 })}>+ Dodaj interval</button>}
  </fieldset>;
}
