
// src/components/chat/knowledge-dialog.tsx
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

interface KnowledgeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentKnowledge: string;
  onSaveKnowledge: (knowledge: string) => void;
}

export function KnowledgeDialog({
  isOpen,
  onOpenChange,
  currentKnowledge,
  onSaveKnowledge,
}: KnowledgeDialogProps) {
  const [knowledge, setKnowledge] = useState(currentKnowledge);

  useEffect(() => {
    setKnowledge(currentKnowledge);
  }, [currentKnowledge, isOpen]); // Reset local state when dialog opens or currentKnowledge changes

  const handleSave = () => {
    onSaveKnowledge(knowledge);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl">Base de Connaissances Personnalisée</DialogTitle>
          <DialogDescription>
            Fournissez ici des informations ou un contexte que l'assistant IA doit utiliser pour mieux vous répondre.
            Ces informations sont stockées localement dans votre navigateur.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="knowledge-textarea" className="text-sm font-medium">
              Vos connaissances :
            </Label>
            <Textarea
              id="knowledge-textarea"
              placeholder="Entrez ici les informations que l'assistant doit connaître (ex: vos préférences, des faits spécifiques, le contexte d'un projet...)"
              value={knowledge}
              onChange={(e) => setKnowledge(e.target.value)}
              className="min-h-[200px] text-sm p-3 rounded-md border bg-background"
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
            Sauvegarder les Connaissances
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
