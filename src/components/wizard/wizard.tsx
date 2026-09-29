"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Gift,
  Heart,
  Baby,
  UserRound,
  UserRoundPlus,
  UsersRound,
  BriefcaseBusiness,
  Cake,
  HeartHandshake,
  Flower,
  PartyPopper,
  GraduationCap,
  MoonStar,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { TakuLoader } from "@/components/taku/taku-loader";
import { useTaku } from "@/components/taku/taku-provider";
import { apiRequest } from "@/lib/client-auth";
import {
  AGE_RANGES,
  INTERESTS,
  OCCASIONS as OCCASION_CATALOG,
  RELATIONSHIPS as RELATIONSHIP_CATALOG,
  recipientPhrase,
} from "@/lib/catalog";
import { TAKU_WIZARD_TIPS } from "@/lib/taku/lines";
import type { GiftSessionInput } from "@/lib/types";
import { cn } from "@/lib/utils";

const RELATIONSHIP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pareja: Heart,
  madre: Flower,
  padre: UserRound,
  hijo: Baby,
  hermano: UsersRound,
  amigo: HeartHandshake,
  companiero: BriefcaseBusiness,
  otro: UserRoundPlus,
};

const OCCASION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  cumpleanos: Cake,
  "san-valentin": HeartHandshake,
  "dia-madre": Flower,
  "dia-padre": UserRound,
  navidad: MoonStar,
  aniversario: Heart,
  graduacion: GraduationCap,
  otro: PartyPopper,
};

const RELATIONSHIPS = RELATIONSHIP_CATALOG.map((r) => ({
  key: r.key,
  label: r.label,
  icon: RELATIONSHIP_ICONS[r.key],
}));

const OCCASIONS = OCCASION_CATALOG.map((o) => ({
  key: o.key,
  label: o.label,
  hasDate: o.hasDate,
  icon: OCCASION_ICONS[o.key],
}));

const BUDGET_PRESETS = [
  { label: "Menos de $50.000", min: 0, max: 50000 },
  { label: "$50.000 – $100.000", min: 50000, max: 100000 },
  { label: "$100.000 – $200.000", min: 100000, max: 200000 },
  { label: "$200.000 – $500.000", min: 200000, max: 500000 },
  { label: "Más de $500.000", min: 500000, max: null },
];

const TOTAL_STEPS = 6;

function stepTitle(step: number, who: string): string {
  return [
    "¿Para quién es el regalo?",
    "¿Cuál es la ocasión?",
    `¿Qué edad tiene ${who}?`,
    "¿Cuánto querés gastar?",
    `¿Qué le gusta a ${who}?`,
    "¿Te dio alguna pista?",
  ][step];
}

interface WizardState {
  recipientName: string;
  recipientRelationship: string;
  occasion: string;
  occasionDate: string;
  ageRange: string;
  budgetMin: number | null;
  budgetMax: number | null;
  customBudget: boolean;
  interests: string[];
  recentHints: string;
  thingsToAvoid: string;
}

interface WizardProps {
  initialRelationship?: string;
}

export function Wizard({ initialRelationship }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const taku = useTaku();
  const { say } = taku;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<WizardState>({
    recipientName: "",
    recipientRelationship: initialRelationship ?? "",
    occasion: "",
    occasionDate: "",
    ageRange: "",
    budgetMin: 100000,
    budgetMax: 200000,
    customBudget: false,
    interests: [],
    recentHints: "",
    thingsToAvoid: "",
  });

  const who = recipientPhrase(state.recipientRelationship, state.recipientName);

  // Taku acompaña cada paso con un consejo corto.
  useEffect(() => {
    say(TAKU_WIZARD_TIPS[step]);
  }, [step, say]);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  /** Actualización funcional: clicks rápidos no pisan la selección previa. */
  function toggleInterest(key: string) {
    setState((prev) => ({
      ...prev,
      interests: prev.interests.includes(key)
        ? prev.interests.filter((k) => k !== key)
        : [...prev.interests, key],
    }));
    setError(null);
    taku.react("happy");
  }

  /** Selección de una opción: Taku festeja con un saltito. */
  function choose<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    update(key, value);
    taku.react("happy");
  }

  const stepError = useMemo(() => {
    switch (step) {
      case 0:
        return state.recipientRelationship ? null : "Elegí para quién es el regalo.";
      case 1:
        return state.occasion ? null : "Elegí la ocasión.";
      case 2:
        return state.ageRange ? null : "Elegí un rango de edad.";
      case 3:
        if (state.customBudget) {
          if (state.budgetMin == null && state.budgetMax == null)
            return "Completá al menos un límite de presupuesto.";
          if (
            state.budgetMin != null &&
            state.budgetMax != null &&
            state.budgetMax > 0 &&
            state.budgetMin > state.budgetMax
          )
            return "El mínimo no puede ser mayor al máximo.";
        }
        return null;
      case 4:
        return state.interests.length > 0
          ? null
          : "Elegí al menos un interés (podés marcar varios).";
      default:
        return null;
    }
  }, [step, state]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload: GiftSessionInput = {
        recipientName: state.recipientName.trim(),
        recipientRelationship: state.recipientRelationship,
        occasion: state.occasion,
        occasionDate: state.occasionDate || null,
        ageRange: state.ageRange,
        budgetMin: state.budgetMin ?? 0,
        budgetMax: state.budgetMax,
        interests: state.interests,
        recentHints: state.recentHints.trim(),
        thingsToAvoid: state.thingsToAvoid.trim(),
        additionalNotes: "",
      };
      const result = await apiRequest<{ sessionId: string }>("/api/recommend", {
        method: "POST",
        body: payload,
      });
      router.push(`/resultados?session=${result.sessionId}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Algo salió mal. Intentá nuevamente."
      );
      say({
        text: "Uy, algo falló de mi lado. Tus respuestas siguen acá: probá de nuevo.",
        mood: "sad",
      });
      setSubmitting(false);
    }
  }

  function next() {
    if (stepError) {
      setError(stepError);
      taku.react("curious");
      return;
    }
    setError(null);
    if (step === TOTAL_STEPS - 1) {
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    titleRef.current?.focus({ preventScroll: true });
  }

  function back() {
    setError(null);
    if (step === 0) {
      router.push("/");
      return;
    }
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    titleRef.current?.focus({ preventScroll: true });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      {submitting && <TakuLoader recipient={who} />}
      <div className="mb-8">
        <p className="text-sm font-semibold text-primary-ink">
          Paso {step + 1} de {TOTAL_STEPS}
        </p>
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="mt-1 font-heading text-4xl tracking-tight outline-none"
        >
          {stepTitle(step, who)}
        </h1>
        <Progress
          value={((step + 1) / TOTAL_STEPS) * 100}
          className="mt-4 h-2"
          aria-label={`Progreso: paso ${step + 1} de ${TOTAL_STEPS}`}
        />
      </div>

      <div aria-live="polite">
        {step === 0 && (
          <StepRelationship
            value={state.recipientRelationship}
            name={state.recipientName}
            onChange={(v) => choose("recipientRelationship", v)}
            onName={(v) => update("recipientName", v)}
          />
        )}
        {step === 1 && (
          <StepOccasion
            value={state.occasion}
            date={state.occasionDate}
            onOccasion={(v) => choose("occasion", v)}
            onDate={(v) => update("occasionDate", v)}
          />
        )}
        {step === 2 && (
          <StepAge value={state.ageRange} onChange={(v) => choose("ageRange", v)} />
        )}
        {step === 3 && (
          <StepBudget
            state={state}
            onChange={update}
          />
        )}
        {step === 4 && (
          <StepInterests
            value={state.interests}
            onToggle={toggleInterest}
          />
        )}
        {step === 5 && (
          <StepHints
            hints={state.recentHints}
            avoid={state.thingsToAvoid}
            onHints={(v) => update("recentHints", v)}
            onAvoid={(v) => update("thingsToAvoid", v)}
          />
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={back}
          className="gap-1.5 rounded-full"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {step === 0 ? "Inicio" : "Atrás"}
        </Button>
        <Button
          type="button"
          onClick={next}
          disabled={submitting}
          className="h-12 gap-1.5 rounded-full px-7 text-base font-semibold"
        >
          {submitting ? (
            <>
              <Gift className="size-4 animate-pulse" aria-hidden="true" />
              Buscando ideas...
            </>
          ) : step === TOTAL_STEPS - 1 ? (
            <>
              Encontrar mi regalo
              <Sparkles className="size-4" aria-hidden="true" />
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Sin crear cuenta: tus búsquedas quedan guardadas en este navegador.{" "}
        <Link href="/" className="underline underline-offset-2 hover:text-foreground">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}

function OptionGrid({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string; icon?: React.ComponentType<{ className?: string }> }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup">
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.key)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border bg-card px-4 py-5 text-sm font-medium transition-all",
              selected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border hover:border-primary/50 hover:bg-card/70"
            )}
          >
            {option.icon && (
              <option.icon
                className={cn("size-6", selected ? "text-primary-foreground" : "text-primary")}
                aria-hidden="true"
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function StepRelationship({
  value,
  name,
  onChange,
  onName,
}: {
  value: string;
  name: string;
  onChange: (key: string) => void;
  onName: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">¿Para quién es el regalo?</legend>
      <OptionGrid options={RELATIONSHIPS} value={value} onChange={onChange} />
      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="recipient-name" className="text-sm font-medium">
          ¿Cómo se llama? <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <Input
          id="recipient-name"
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Ej: Ana"
          maxLength={40}
          autoComplete="off"
          className="h-11 max-w-xs rounded-xl"
        />
      </div>
    </fieldset>
  );
}

function StepOccasion({
  value,
  date,
  onOccasion,
  onDate,
}: {
  value: string;
  date: string;
  onOccasion: (key: string) => void;
  onDate: (value: string) => void;
}) {
  const occasion = OCCASIONS.find((o) => o.key === value);
  return (
    <fieldset>
      <legend className="sr-only">¿Cuál es la ocasión?</legend>
      <OptionGrid options={OCCASIONS} value={value} onChange={onOccasion} />
      {occasion?.hasDate && (
        <div className="mt-4 flex flex-col gap-2">
          <label
            htmlFor="occasion-date"
            className="inline-flex items-center gap-2 text-sm font-medium"
          >
            <CalendarDays className="size-4 text-primary" aria-hidden="true" />
            ¿Cuándo es? (opcional)
          </label>
          <Input
            id="occasion-date"
            type="date"
            value={date}
            onChange={(e) => onDate(e.target.value)}
            className="h-11 max-w-56 rounded-xl"
          />
        </div>
      )}
    </fieldset>
  );
}

function StepAge({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">¿Qué edad tiene?</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup">
        {AGE_RANGES.map((range) => {
          const selected = value === range.key;
          return (
            <button
              key={range.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(range.key)}
              className={cn(
                "rounded-2xl border bg-card px-4 py-4 text-sm font-medium transition-all",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border hover:border-primary/50 hover:bg-card/70"
              )}
            >
              {range.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function StepBudget({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void;
}) {
  return (
    <div>
      <div className="grid gap-2" role="radiogroup" aria-label="Presupuesto">
        {BUDGET_PRESETS.map((preset) => {
          const selected =
            !state.customBudget &&
            state.budgetMin === preset.min &&
            state.budgetMax === preset.max;
          return (
            <button
              key={preset.label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                onChange("customBudget", false);
                onChange("budgetMin", preset.min);
                onChange("budgetMax", preset.max);
              }}
              className={cn(
                "flex items-center justify-between rounded-2xl border bg-card px-4 py-3.5 text-sm font-medium transition-all",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border hover:border-primary/50 hover:bg-card/70"
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={state.customBudget}
          onClick={() => onChange("customBudget", true)}
          className={cn(
            "rounded-2xl border bg-card px-4 py-3.5 text-sm font-medium transition-all",
            state.customBudget
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border hover:border-primary/50 hover:bg-card/70"
          )}
        >
          Presupuesto personalizado
        </button>
      </div>

      {state.customBudget && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="budget-min" className="text-sm font-medium">
              Mínimo (opcional)
            </label>
            <Input
              id="budget-min"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              placeholder="Ej: 80.000"
              value={state.budgetMin ?? ""}
              onChange={(e) =>
                onChange(
                  "budgetMin",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              className="h-11 rounded-xl"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="budget-max" className="text-sm font-medium">
              Máximo (opcional)
            </label>
            <Input
              id="budget-max"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              placeholder="Ej: 300.000"
              value={state.budgetMax ?? ""}
              onChange={(e) =>
                onChange(
                  "budgetMax",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              className="h-11 rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StepInterests({
  value,
  onToggle,
}: {
  value: string[];
  onToggle: (key: string) => void;
}) {
  const toggle = onToggle;
  return (
    <fieldset>
      <legend className="mb-3 block text-sm font-medium">
        Marcá todo lo que le gusta
      </legend>
      <div className="flex flex-wrap gap-2">
        {INTERESTS.map((interest) => {
          const selected = value.includes(interest.key);
          return (
            <button
              key={interest.key}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(interest.key)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                selected
                  ? "border-accent bg-accent text-accent-foreground shadow-sm"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              {interest.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function StepHints({
  hints,
  avoid,
  onHints,
  onAvoid,
}: {
  hints: string;
  avoid: string;
  onHints: (v: string) => void;
  onAvoid: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="hints" className="text-sm font-medium">
          ¿Te dio alguna pista últimamente? (opcional)
        </label>
        <p className="text-sm text-muted-foreground">
          Algo que dijo, algo que necesita o algo que hace tiempo quiere
          comprar. Cuanto más específico, mejor.
        </p>
        <Textarea
          id="hints"
          value={hints}
          onChange={(e) => onHints(e.target.value)}
          placeholder='Ej: "El otro día dijo que quería algo nuevo para la parrilla"'
          rows={3}
          className="rounded-2xl"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="avoid" className="text-sm font-medium">
          ¿Hay algo que ya tenga o que NO quieras regalarle? (opcional)
        </label>
        <Textarea
          id="avoid"
          value={avoid}
          onChange={(e) => onAvoid(e.target.value)}
          placeholder='Ej: "Ya tiene muchos perfumes"'
          rows={3}
          className="rounded-2xl"
        />
      </div>
    </div>
  );
}