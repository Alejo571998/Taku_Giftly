"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TakuPeek } from "@/components/taku/taku-peek";
import { PEEK_DIALOG_CLASSES } from "@/components/home/join-group-dialog";
import { apiRequest } from "@/lib/client-auth";
import { rememberDisplayName, savedDisplayName } from "@/lib/display-name";
import type { Group } from "@/lib/types";

export function CreateGroupDialog({
  sessionId,
  suggestedName,
  open,
  onOpenChange,
}: {
  sessionId: string;
  /** Ej: "Regalo para tu papá" */
  suggestedName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [displayName, setDisplayName] = useState(() => savedDisplayName());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("Ponele un nombre al grupo (mínimo 2 caracteres).");
      return;
    }
    if (displayName.trim().length < 2) {
      setError("Decinos tu nombre así tu gente sabe quién los invitó.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<{ group: Group }>("/api/groups", {
        method: "POST",
        body: { sessionId, name: name.trim(), displayName: displayName.trim() },
      });
      rememberDisplayName(displayName.trim());
      const url = `${window.location.origin}/grupo/${result.group.inviteCode}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("¡Grupo creado! Copiamos el link para que lo compartas.");
      } catch {
        toast.success("¡Grupo creado! Compartí el link desde la pantalla del grupo.");
      }
      onOpenChange(false);
      router.push(`/grupo/${result.group.inviteCode}?nuevo=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal. Intentá nuevamente.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={PEEK_DIALOG_CLASSES}
        style={{ "--peek-offset": "78px" } as React.CSSProperties}
      >
        <TakuPeek mood="happy" size={130} message="¡Decidir en grupo es mi parte favorita!">
          <div className="grid gap-4 rounded-3xl bg-popover p-5 ring-1 ring-foreground/10 shadow-xl">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-normal">
                Decidirlo en grupo
              </DialogTitle>
              <DialogDescription>
                Creás un link, tu gente entra sin registrarse y puntúa cada
                idea. Gana la más votada.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="flex flex-col gap-3" noValidate>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="group-name" className="text-sm font-medium">
                  Nombre del grupo
                </label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ej: Regalo para papá"
                  maxLength={80}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="creator-name" className="text-sm font-medium">
                  Tu nombre
                </label>
                <Input
                  id="creator-name"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setError(null);
                  }}
                  placeholder="¿Cómo te llamás?"
                  autoComplete="given-name"
                  maxLength={40}
                  autoFocus
                  className="h-11 rounded-xl"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="mt-1 h-11 w-full rounded-full font-semibold"
              >
                <Users className="size-4" aria-hidden="true" />
                {loading ? "Creando grupo..." : "Crear grupo y copiar link"}
              </Button>
            </form>
          </div>
        </TakuPeek>
      </DialogContent>
    </Dialog>
  );
}
