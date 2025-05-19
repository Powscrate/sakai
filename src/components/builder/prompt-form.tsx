
"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface PromptFormProps {
  initialPrompt?: string; // Can still accept an initial prompt if needed elsewhere
  onSubmitPrompt: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptForm({ initialPrompt = "", onSubmitPrompt, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState<string>(initialPrompt);

  // Effect to update local prompt state if initialPrompt prop changes
  // This might be useful if the parent component can reset the prompt
  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onSubmitPrompt(prompt.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">
      <div className="grid w-full gap-1.5 flex-1">
        <Label htmlFor="project-prompt" className="text-sm font-medium">
          Décrivez l'application que vous souhaitez générer :
        </Label>
        <Textarea
          id="project-prompt"
          placeholder="Ex: Une application de compteur simple avec un bouton + et -, affichant le compte actuel. Style moderne avec Tailwind."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[200px] flex-1 resize-none bg-background text-sm p-3"
          disabled={isLoading}
          rows={10}
        />
         <p className="text-xs text-muted-foreground">
          Sakai tentera de générer un projet Vite + React + TypeScript + Tailwind CSS. Soyez aussi précis que possible.
        </p>
      </div>
      <Button type="submit" disabled={isLoading || !prompt.trim()} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Génération en cours...
          </>
        ) : (
          "Générer le projet"
        )}
      </Button>
    </form>
  );
}

    