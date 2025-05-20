
"use client";
import { useState, useCallback, ChangeEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UploadCloud, Eraser, Wand2, Loader2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { SakaiLogo } from '@/components/icons/logo';
import { MaskingCanvas } from '@/components/inpainter/masking-canvas'; // We'll create this

const INPAINTING_API_ENDPOINT = "https://stabilityai-stable-diffusion-2-inpainting.hf.space/run/predict"; // Example, might need adjustment

type InpaintingStep = "upload" | "mask" | "prompt" | "result";

export default function SakaiInpainterPage() {
  const [currentStep, setCurrentStep] = useState<InpaintingStep>("upload");
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  
  const [maskImage, setMaskImage] = useState<string | null>(null); // Mask drawn by user
  const [inpaintingPrompt, setInpaintingPrompt] = useState<string>("");
  const [inpaintedResult, setInpaintedResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setOriginalImageFile(file);
        setCurrentStep("mask");
        setError(null);
      };
      reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier image.");
        toast({ title: "Erreur Image", description: "Impossible de charger l'image.", variant: "destructive" });
      }
      reader.readAsDataURL(file);
    }
  };

  const handleMaskReady = (finalMaskDataUrl: string) => {
    setMaskImage(finalMaskDataUrl);
    setCurrentStep("prompt");
  };

  const handleStartOver = () => {
    setOriginalImage(null);
    setOriginalImageFile(null);
    setMaskImage(null);
    setInpaintingPrompt("");
    setInpaintedResult(null);
    setCurrentStep("upload");
    setError(null);
  };

  const handleInpaintingSubmit = async () => {
    if (!originalImage || !maskImage || !inpaintingPrompt.trim()) {
      setError("Veuillez fournir une image, un masque et une invite.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setInpaintedResult(null);

    try {
      // Note: The Hugging Face Space API for stabilityai/stable-diffusion-2-inpainting
      // might have a specific fn_index or slightly different payload structure.
      // This is a common structure but may need adjustment.
      const payload = {
        data: [
          originalImage, // original image data URL
          maskImage,     // mask image data URL (white = inpaint area)
          inpaintingPrompt
        ]
      };
      
      const response = await fetch(INPAINTING_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erreur API: ${response.status} - ${errorData}`);
      }

      const result = await response.json();

      if (result.data && result.data[0]) {
        // The output is typically a base64 data URI string or an array of them
        setInpaintedResult(result.data[0]);
        setCurrentStep("result");
      } else {
        console.error("API Response unexpected format:", result);
        throw new Error("Format de réponse API inattendu.");
      }
    } catch (err: any) {
      console.error("Inpainting API error:", err);
      setError(err.message || "Une erreur est survenue lors de la retouche d'image.");
      // Keep current step or go back to prompt for retry? For now, stay on prompt.
    } finally {
      setIsLoading(false);
    }
  };
  
  // Dummy toast function if not using a global toast context here
  const toast = ({ title, description, variant }: { title: string, description: string, variant?: string }) => {
    console.log(`Toast (${variant || 'default'}): ${title} - ${description}`);
    // In a real app, this would call the actual toast hook
  };


  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 border-b bg-card flex items-center justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" passHref>
            <Button variant="ghost" size="icon" aria-label="Retour à l'accueil">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <SakaiLogo className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-semibold">Sakai Inpainter</h1>
        </div>
        {currentStep !== "upload" && (
          <Button variant="outline" onClick={handleStartOver}>
            <Eraser className="mr-2 h-4 w-4" /> Recommencer
          </Button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {currentStep === "upload" && "Étape 1: Téléversez votre Image"}
              {currentStep === "mask" && "Étape 2: Dessinez un Masque"}
              {currentStep === "prompt" && "Étape 3: Décrivez la Modification"}
              {currentStep === "result" && "Résultat de la Retouche"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Erreur</p>
                  <p className="text-xs break-words">{error}</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center p-10 text-muted-foreground">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="font-semibold">Sakai retouche votre image...</p>
                <p className="text-sm">Veuillez patienter, cela peut prendre un moment.</p>
              </div>
            )}

            {!isLoading && currentStep === "upload" && (
              <div className="flex flex-col items-center space-y-4 p-8 border-2 border-dashed border-muted rounded-lg hover:border-primary transition-colors">
                <UploadCloud className="h-16 w-16 text-muted-foreground" />
                <Label htmlFor="image-upload" className="cursor-pointer text-primary font-medium hover:underline">
                  Cliquez pour téléverser ou glissez-déposez une image
                </Label>
                <Input
                  id="image-upload"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                />
                <p className="text-xs text-muted-foreground">Formats supportés : PNG, JPG, WEBP</p>
              </div>
            )}

            {!isLoading && currentStep === "mask" && originalImage && (
              <MaskingCanvas
                originalImageSrc={originalImage}
                onMaskReady={handleMaskReady}
              />
            )}
            
            {!isLoading && currentStep === "prompt" && originalImage && maskImage && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <Label className="text-sm font-medium">Image Originale</Label>
                    <Image src={originalImage} alt="Original" width={400} height={400} className="rounded-md border object-contain aspect-square" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Masque (zone à modifier en blanc)</Label>
                    <Image src={maskImage} alt="Mask" width={400} height={400} className="rounded-md border object-contain aspect-square bg-gray-700" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="inpainting-prompt" className="text-sm font-medium">
                    Que voulez-vous générer dans la zone masquée ?
                  </Label>
                  <Textarea
                    id="inpainting-prompt"
                    placeholder="Ex: un ciel étoilé, des fleurs colorées, enlever cet objet..."
                    value={inpaintingPrompt}
                    onChange={(e) => setInpaintingPrompt(e.target.value)}
                    className="min-h-[100px]"
                    rows={3}
                  />
                </div>
                <Button onClick={handleInpaintingSubmit} disabled={isLoading || !inpaintingPrompt.trim()} className="w-full">
                  <Wand2 className="mr-2 h-4 w-4" /> Lancer la Retouche Magique
                </Button>
              </div>
            )}

            {!isLoading && currentStep === "result" && originalImage && inpaintedResult && (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label className="text-sm font-medium block mb-1 text-center">Image Originale</Label>
                        <Image src={originalImage} alt="Original" width={500} height={500} className="rounded-lg border shadow-md object-contain aspect-square mx-auto" />
                    </div>
                    <div>
                        <Label className="text-sm font-medium block mb-1 text-center">Image Retouchée</Label>
                        <Image src={inpaintedResult.startsWith('data:') ? inpaintedResult : `data:image/png;base64,${inpaintedResult}`} alt="Inpainted Result" width={500} height={500} className="rounded-lg border shadow-md object-contain aspect-square mx-auto" />
                    </div>
                </div>
                <Button onClick={handleStartOver} variant="default" className="w-full sm:w-auto mx-auto flex">
                  <Eraser className="mr-2 h-4 w-4" /> Retoucher une autre image
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

