// src/app/profile/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SakaiLogo } from '@/components/icons/logo';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Loader2, ArrowLeft, ImageUp, Link2 } from 'lucide-react';
import useLocalStorage from '@/hooks/use-local-storage';

const getUserAvatarKey = (userId: string | undefined) => userId ? `sakaiUserAvatar_${userId}` : 'sakaiUserAvatar_anonymous_fallback';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  
  // Avatar state will be managed by useLocalStorage once currentUser is available
  const [avatarUrl, setAvatarUrl] = useLocalStorage<string>(getUserAvatarKey(currentUser?.uid), '');

  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setDisplayName(user.displayName || '');
        setEmail(user.email || '');
        // Initialize avatarUrlInput with the stored avatarUrl for this user
        // This happens after currentUser is set, so useLocalStorage gets the correct key
      } else {
        router.push('/auth/login');
      }
      setPageLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Effect to sync avatarUrlInput with avatarUrl from localStorage once currentUser is loaded
  useEffect(() => {
    if (currentUser && avatarUrl) {
      setAvatarUrlInput(avatarUrl);
    }
  }, [currentUser, avatarUrl]);


  const handleProfileUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser) {
      toast({ title: "Erreur", description: "Utilisateur non connecté.", variant: "destructive" });
      return;
    }
    if (!displayName.trim()) {
      toast({ title: "Erreur", description: "Le nom ne peut pas être vide.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await updateProfile(currentUser, { displayName: displayName.trim() });
      // Save avatar URL from input to localStorage
      if (avatarUrlInput.trim() && (avatarUrlInput.startsWith('http://') || avatarUrlInput.startsWith('https://') || avatarUrlInput.startsWith('data:image'))) {
        setAvatarUrl(avatarUrlInput.trim());
         toast({ title: "Profil mis à jour", description: "Votre nom et avatar ont été sauvegardés avec succès." });
      } else if (!avatarUrlInput.trim() && avatarUrl) {
        setAvatarUrl(''); // Clear avatar if input is cleared
        toast({ title: "Profil mis à jour", description: "Votre nom a été sauvegardé et l'avatar a été retiré." });
      } else if (avatarUrlInput.trim()) {
        toast({ title: "URL d'avatar invalide", description: "Veuillez entrer une URL valide (http, https, data:image). L'avatar n'a pas été sauvegardé.", variant: "destructive" });
        toast({ title: "Profil mis à jour", description: "Votre nom a été sauvegardé avec succès (avatar non modifié)." });
      } else {
         toast({ title: "Profil mis à jour", description: "Votre nom a été sauvegardé avec succès." });
      }

      if (auth.currentUser) {
         setCurrentUser(auth.currentUser); 
         setDisplayName(auth.currentUser.displayName || '');
      }
    } catch (error) {
      console.error("Profile update error:", error);
      let errorMessage = "Erreur lors de la mise à jour du profil.";
      if (error instanceof FirebaseError) {
        errorMessage = error.message;
      }
      toast({ title: "Erreur de mise à jour", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Max 2MB
        toast({ title: "Fichier trop volumineux", description: "Veuillez choisir une image de moins de 2MB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrlInput(reader.result as string);
        toast({ title: "Image chargée", description: "N'oubliez pas de sauvegarder les modifications." });
      };
      reader.readAsDataURL(file);
    }
  };


  if (pageLoading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-background to-muted/30 p-4 pt-10">
      <Button variant="ghost" onClick={() => router.push('/')} className="absolute top-4 left-4 text-sm z-10">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Chat
      </Button>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex flex-col items-center">
            {avatarUrl ? (
                <NextImage 
                    src={avatarUrl} 
                    alt="Avatar" 
                    width={80} 
                    height={80} 
                    className="h-20 w-20 rounded-full object-cover border-2 border-primary shadow-md"
                    onError={(e) => {
                        console.warn("Error loading avatar image, falling back or clearing.");
                        // Potentially clear avatarUrl if image fails to load, or set a fallback
                        // e.currentTarget.src = 'https://placehold.co/80x80.png?text=Error'; // Example fallback
                        // setAvatarUrl(''); // Or clear it
                    }}
                    data-ai-hint="user avatar preview"
                />
            ) : (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border-2 border-dashed">
                    <UserIcon className="h-10 w-10 text-muted-foreground" />
                </div>
            )}
            <SakaiLogo className="h-10 w-10 text-primary mt-3" />
          </div>
          <CardTitle className="text-3xl font-bold">Mon Profil</CardTitle>
          <CardDescription>Gérez les informations de votre compte Sakai.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="text-base bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nom d'affichage</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Votre nom"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
                <Label htmlFor="avatarUrl">URL de l'avatar (ou téléversez)</Label>
                <div className="flex items-center gap-2">
                    <Input
                        id="avatarUrl"
                        type="text"
                        placeholder="https://... ou data:image/..."
                        value={avatarUrlInput}
                        onChange={(e) => setAvatarUrlInput(e.target.value)}
                        className="text-sm flex-grow"
                    />
                    <Button type="button" variant="outline" size="icon" asChild className="shrink-0">
                        <Label htmlFor="avatarFile" className="cursor-pointer">
                            <ImageUp className="h-4 w-4"/>
                            <input id="avatarFile" type="file" accept="image/png, image/jpeg, image/webp, image/gif" className="sr-only" onChange={handleAvatarFileUpload} />
                        </Label>
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground">Collez une URL d'image ou téléversez un fichier (max 2MB).</p>
            </div>
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder les modifications'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
