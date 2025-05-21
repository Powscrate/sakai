// src/app/profile/page.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SakaiLogo } from '@/components/icons/logo';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setDisplayName(user.displayName || '');
        setEmail(user.email || '');
      } else {
        router.push('/auth/login');
      }
      setPageLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

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
      toast({ title: "Profil mis à jour", description: "Votre nom a été sauvegardé avec succès." });
      // Re-fetch user to update state if needed, or trust Firebase to update currentUser object
      if (auth.currentUser) { // Check if currentUser is still valid
         setCurrentUser(auth.currentUser); // Re-assign to trigger potential re-renders if object identity changes
         setDisplayName(auth.currentUser.displayName || ''); // Ensure local state matches
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

  if (pageLoading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-background to-muted/30 p-4 pt-10">
      <Button variant="ghost" onClick={() => router.push('/')} className="absolute top-4 left-4 text-sm">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour au Chat
      </Button>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <SakaiLogo className="h-16 w-16 text-primary" />
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
                disabled // Email is not editable
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
