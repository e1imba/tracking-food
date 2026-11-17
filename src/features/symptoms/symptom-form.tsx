"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createSymptom } from "../../app/actions/symptoms";
import { localDateTime, localTimeToInstant } from "../meals/schema";
import { symptomFormSchema, type SymptomFormValues } from "./schema";

export function SymptomForm({ onDirtyChange, onSavingChange, onSuccess }: {
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [initialTime] = useState(() => localDateTime(new Date()));
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<SymptomFormValues>({
    resolver: zodResolver(symptomFormSchema), defaultValues: { name: "", note: "", localTime: initialTime, severity: "" },
  });
  const [message, setMessage] = useState("");
  useEffect(() => { onDirtyChange(isDirty); }, [isDirty, onDirtyChange]);
  useEffect(() => { onSavingChange(isSubmitting); }, [isSubmitting, onSavingChange]);
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
  return <form className="meal-form" onSubmit={handleSubmit(async values => {
    setMessage("");
    onSavingChange(true);
    try {
      const result = await createSymptom({ name: values.name, note: values.note,
        startedAt: localTimeToInstant(values.localTime), severity: values.severity === "" ? null : Number(values.severity) });
      if (result.ok) { router.refresh(); onSuccess(); }
      else setMessage(result.message);
    } catch { setMessage("Simptom nije sačuvan. Proverite lokalni datum i vreme i pokušajte ponovo."); }
    finally { onSavingChange(false); }
  })}>
    <div className="form-scroll"><fieldset disabled={isSubmitting} className="min-w-0">
      <label className="field">Naziv simptoma<input {...register("name")} required maxLength={200} autoFocus className="control" aria-invalid={!!errors.name} aria-describedby={errors.name ? "symptom-name-error" : undefined} /></label>
      {errors.name && <span id="symptom-name-error" role="alert">Unesite naziv (do 200 znakova).</span>}
      <label className="field">Datum i vreme početka<input {...register("localTime")} type="datetime-local" required className="control" aria-invalid={!!errors.localTime} aria-describedby="symptom-time-help" /></label>
      {errors.localTime && <span role="alert">Unesite datum i vreme početka.</span>}
      <p id="symptom-time-help" className="field-help">Lokalno vreme vašeg uređaja. Možete uneti raniji početak.</p>
      <label className="field">Jačina (opciono)<input {...register("severity")} type="number" min={1} max={10} step={1} className="control" aria-invalid={!!errors.severity} aria-describedby="severity-help" /></label>
      <p id="severity-help" className="field-help">Od 1 do 10, ili ostavite prazno.</p>
      {errors.severity && <span role="alert">Unesite ceo broj od 1 do 10.</span>}
      <label className="field">Napomena (opciono)<textarea {...register("note")} maxLength={5000} rows={3} className="control" aria-invalid={!!errors.note} /></label>
      {errors.note && <span role="alert">Napomena može imati do 5000 znakova.</span>}
    </fieldset></div>
    <footer className="form-footer"><p role="status">{message}</p><button className="primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Čuvanje…" : "Sačuvaj simptom"}</button></footer>
  </form>;
}
