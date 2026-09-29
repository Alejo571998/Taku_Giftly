"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TakuPeek } from "@/components/taku/taku-peek";

/** Clases para que el popup sea transparente y la tarjeta viva dentro de TakuPeek. */
export const PEEK_DIALOG_CLASSES =
  "bg-transparent p-0 ring-0 shadow-none sm:max-w-sm [&>button]:top-[calc(var(--peek-offset)+0.75rem)] [&>button]:right-3 [&>button]:z-20";

export function JoinGroupDialog() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) {
      setError("El código tiene 6 caracteres, por ejemplo AB3K9Z.");
      return;
    }
    setError(null);
    setOpen(false);
    router.push(`/grupo/${trimmed}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="lg" className="h-12 rounded-full px-6 text-base" />}
      >
        <Ticket className="size-4" aria-hidden="true" />
        Tengo un código de grupo
      </DialogTrigger>
      <DialogContent
        className={PEEK_DIALOG_CLASSES}
        style={{ "--peek-offset": "78px" } as React.CSSProperties}
      >
        <TakuPeek mood="curious" size={130} message="¿Te pasaron un código? Dámelo y te llevo.">
          <div className="grid gap-4 rounded-3xl bg-popover p-5 ring-1 ring-foreground/10 shadow-xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-normal">
                Unirme a un grupo
              </DialogTitle>
              <DialogDescription>
                Ingresá el código que te compartieron. No necesitás crear cuenta.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label htmlFor="invite-code" className="sr-only">
                Código de grupo
              </label>
              <Input
                id="invite-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError(null);
                }}
                placeholder="AB3K9Z"
                autoComplete="off"
                maxLength={8}
                className="h-12 rounded-xl text-center font-mono text-xl uppercase tracking-[0.3em]"
                aria-invalid={error != null}
                aria-describedby={error ? "invite-code-error" : undefined}
              />
              {error && (
                <p id="invite-code-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="h-11 rounded-full font-semibold">
                Entrar al grupo
              </Button>
            </form>
          </div>
        </TakuPeek>
      </DialogContent>
    </Dialog>
  );
}
