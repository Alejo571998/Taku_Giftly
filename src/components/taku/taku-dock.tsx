"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageCircle, Send, X } from "lucide-react";
import { TakuImage } from "@/components/taku/taku-image";
import { useTaku } from "@/components/taku/taku-provider";
import { takuChatAdapter } from "@/lib/taku/chat";
import { panelTipsFor } from "@/lib/taku/lines";
import { cn } from "@/lib/utils";

/**
 * Taku en la esquina inferior izquierda: burbuja de diálogo contextual y un
 * panel (historial + consejos) que ya es la carcasa del futuro chatbot.
 */
export function TakuDock() {
  const taku = useTaku();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const chatEnabled = takuChatAdapter != null;

  useEffect(() => {
    if (!open) return;
    historyEndRef.current?.scrollIntoView({ block: "end" });
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, taku.history.length]);

  // Al cambiar de pantalla el panel se cierra.
  const [panelPath, setPanelPath] = useState(taku.context.pathname);
  if (panelPath !== taku.context.pathname) {
    setPanelPath(taku.context.pathname);
    setOpen(false);
  }

  if (taku.hiddenBy > 0) return null;

  if (taku.minimized) {
    return (
      <button
        type="button"
        onClick={() => taku.setMinimized(false)}
        className="fixed bottom-3 left-3 z-40 flex items-center gap-1.5 rounded-full border border-border bg-card py-1 pr-3 pl-1 text-xs font-semibold shadow-md transition-transform hover:-translate-y-0.5 sm:bottom-5 sm:left-5"
        aria-label="Mostrar a Taku"
      >
        <TakuImage size={28} mood="idle" className="size-7 animate-none!" />
        Taku
      </button>
    );
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !takuChatAdapter) return;
    setDraft("");
    setSending(true);
    const messages = taku.addUserMessage(text);
    taku.react("thinking");
    try {
      const reply = await takuChatAdapter.reply({ messages, context: taku.context });
      taku.say({ text: reply.text, mood: reply.mood ?? "happy" });
    } catch {
      taku.say({ text: "Uy, me trabé. ¿Probás de nuevo?", mood: "sad" });
    } finally {
      setSending(false);
    }
  }

  const tips = panelTipsFor(taku.context.pathname);
  const bubble = open ? null : taku.bubble;

  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-40 flex items-end gap-2 sm:bottom-4 sm:left-4">
      <div className="pointer-events-auto relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            taku.dismiss();
          }}
          aria-expanded={open}
          aria-controls="taku-panel"
          aria-label={open ? "Cerrar el panel de Taku" : "Abrir a Taku, tu asistente"}
          className="group relative block rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            aria-hidden="true"
            className="absolute inset-x-2 bottom-1 h-3 rounded-full bg-foreground/10 blur-sm"
          />
          <TakuImage
            size={96}
            mood={taku.mood}
            className="relative size-16 transition-transform group-hover:scale-105 sm:size-24"
          />
          {!open && taku.history.length > 0 && !bubble && (
            <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background">
              <MessageCircle className="size-3" aria-hidden="true" />
            </span>
          )}
        </button>
      </div>

      {/* Burbuja de diálogo */}
      <div aria-live="polite" className="pointer-events-auto mb-8 sm:mb-12">
        {bubble && (
          <div
            key={bubble.id}
            className="taku-bubble relative max-w-[min(18rem,calc(100vw-6.5rem))] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 text-sm leading-snug text-foreground shadow-lg"
          >
            <p className="pr-5">{bubble.text}</p>
            {bubble.action?.href && (
              <Link
                href={bubble.action.href}
                className="mt-2 inline-flex text-sm font-semibold text-primary-ink underline-offset-2 hover:underline"
              >
                {bubble.action.label}
              </Link>
            )}
            <button
              type="button"
              onClick={taku.dismiss}
              className="absolute top-2 right-2 grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Cerrar mensaje de Taku"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {/* Panel: historial + consejos (carcasa del chatbot) */}
      {open && (
        <div
          id="taku-panel"
          role="dialog"
          aria-label="Taku, tu asistente de regalos"
          className="taku-bubble pointer-events-auto absolute bottom-full left-0 mb-2 flex max-h-[min(30rem,70vh)] w-[min(22rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl"
        >
          <div className="flex items-center gap-3 border-b border-border bg-secondary px-4 py-3">
            <TakuImage size={40} mood="wave" className="size-10" />
            <div className="min-w-0 flex-1">
              <p className="font-heading text-lg leading-none">Taku</p>
              <p className="text-xs text-muted-foreground">Tu asistente de regalos</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                taku.setMinimized(true);
              }}
              className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Minimizar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Cerrar panel"
            >
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {taku.history.length === 0 && (
              <p className="rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm">
                ¡Hola! Soy Taku. Te acompaño a encontrar un regalo que tenga
                sentido, y a decidirlo con tu gente.
              </p>
            )}
            {taku.history.map((message) => (
              <p
                key={message.id}
                className={cn(
                  "w-fit max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  message.role === "taku"
                    ? "rounded-tl-sm bg-muted"
                    : "ml-auto rounded-tr-sm bg-primary text-primary-foreground"
                )}
              >
                {message.text}
              </p>
            ))}
            <div ref={historyEndRef} />
            <div className="pt-2">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Consejos para esta pantalla
              </p>
              <ul className="mt-2 space-y-1.5">
                {tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm text-foreground/85">
                    <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
            <label htmlFor="taku-input" className="sr-only">
              Escribile a Taku
            </label>
            <input
              id="taku-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={!chatEnabled || sending}
              placeholder={chatEnabled ? "Preguntame lo que quieras..." : "Muy pronto vas a poder escribirme"}
              className="h-10 min-w-0 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              type="submit"
              disabled={!chatEnabled || sending || !draft.trim()}
              className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
