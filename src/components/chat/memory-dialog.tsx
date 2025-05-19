// src/components/chat/memory-dialog.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface MemoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentMemory: string;
  onSaveMemory: (memory: string) => void;
}

export function MemoryDialog({
  isOpen,
  onOpenChange,
  currentMemory,
  onSaveMemory,
}: MemoryDialogProps) {
  const [memory, setMemory] = useState(currentMemory);

  useEffect(() => {
    if (isOpen) { // Seulement mettre à jour la mémoire locale si le dialogue est ouvert
      setMemory(currentMemory);
    }
  }, [currentMemory, isOpen]);

  const handleSave = () => {
    onSaveMemory(memory);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl">Panneau de Mémoire de Sakai</DialogTitle>
          <DialogDescription>
            Fournissez ici des informations, préférences ou contextes que Sakai doit mémoriser pour mieux vous assister.
            Ces informations sont stockées localement dans votre navigateur.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="memory-textarea" className="text-sm font-medium">
              Mémoire de Sakai :
            </Label>
            <Textarea
              id="memory-textarea"
              placeholder="Entrez ici les informations que Sakai doit connaître (ex: vos préférences, des faits spécifiques, le contexte d'un projet, qui vous êtes...)"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              className="min-h-[200px] text-sm p-3 rounded-md border bg-background"
              rows={10}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Sauvegarder la Mémoire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
