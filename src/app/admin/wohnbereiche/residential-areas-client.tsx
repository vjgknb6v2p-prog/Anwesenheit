"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteResidentialAreaAction,
  upsertResidentialAreaAction,
} from "@/actions/admin-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ResidentialAreaWithCount {
  id: string;
  name: string;
  userCount: number;
}

export function ResidentialAreasClient({
  areas,
}: {
  areas: ResidentialAreaWithCount[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setPending("create");
    setError(null);
    const result = await upsertResidentialAreaAction({ name: newName });
    setPending(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setNewName("");
    router.refresh();
  }

  async function handleRename(id: string) {
    setPending(id);
    setError(null);
    const result = await upsertResidentialAreaAction({ id, name: editingName });
    setPending(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Diesen Wohnbereich wirklich löschen?")) {
      return;
    }
    setPending(id);
    setError(null);
    const result = await deleteResidentialAreaAction(id);
    setPending(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Wohnbereiche ({areas.length})</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Neuer Wohnbereich…"
          required
        />
        <Button type="submit" disabled={pending === "create"}>
          {pending === "create" ? "Wird angelegt…" : "Anlegen"}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {areas.map((area) => (
          <li
            key={area.id}
            className="flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm"
          >
            {editingId === area.id ? (
              <>
                <Input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  className="max-w-xs"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending === area.id}
                    onClick={() => void handleRename(area.id)}
                  >
                    Speichern
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Abbrechen
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="font-medium">{area.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {area.userCount} Benutzer zugeordnet
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(area.id);
                      setEditingName(area.name);
                    }}
                  >
                    Umbenennen
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending === area.id}
                    onClick={() => void handleDelete(area.id)}
                  >
                    Löschen
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
