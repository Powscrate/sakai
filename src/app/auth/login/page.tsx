
// src/app/auth/login/page.tsx
"use client";

import { useState, FormEvent, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { SakaiLogo } from '@/components/icons/logo';
import { GoogleIcon } from '@/components/icons/google-icon';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { auth, googleProvider } from '@/lib/firebase'; 
import { signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, User as FirebaseUser } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { generateLoginThought, type GenerateLoginThoughtOutput } from '@/ai/flows/generate-login-thought-flow';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [dynamicSubtitle, setDynamicSubtitle] = useState("Connectez-vous pour discuter avec votre assistant IA.");
  const [isSubtitleLoading, setIsSubtitleLoading] = useState(false);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emailInputRef = useRef<HTMLInputElement>(null); // Ref for email input

  const fetchLoginThought = useCallback(async (currentEmail: string) => {
    setIsSubtitleLoading(true);
    try {
      const result: GenerateLoginThoughtOutput = await generateLoginThought({ emailFragment: currentEmail });
      if (result.thought) {
        setDynamicSubtitle(result.thought);
      } else if (result.error) {
        console.warn("Login thought generation error:", result.error);
        // Keep previous or default subtitle
      }
    } catch (error) {
      console.error("Error fetching login thought:", error);
    } finally {
      setIsSubtitleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoginThought(""); // Initial thought
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      if (email.trim().length > 0) { 
        fetchLoginThought(email);
         if (intervalTimeoutRef.current) clearInterval(intervalTimeoutRef.current);
      } else if (email.trim().length === 0 && !intervalTimeoutRef.current) {
        fetchLoginThought("");
        // Restart interval for generic thoughts if email is empty
        intervalTimeoutRef.current = setInterval(() => {
            if (document.visibilityState === 'visible' && document.activeElement !== emailInputRef.current) {
                fetchLoginThought("");
            }
        }, 20000);
      }
    }, 700); 

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [email, fetchLoginThought]);

  useEffect(() => {
    if (email.trim().length === 0) {
      if (intervalTimeoutRef.current) clearInterval(intervalTimeoutRef.current);
      intervalTimeoutRef.current = setInterval(() => {
        if (document.visibilityState === 'visible' && document.activeElement !== emailInputRef.current) {
            fetchLoginThought("");
        }
      }, 20000); 
    } else {
      if (intervalTimeoutRef.current) {
        clearInterval(intervalTimeoutRef.current);
        intervalTimeoutRef.current = null;
      }
    }
    return () => {
      if (intervalTimeoutRef.current) {
        clearInterval(intervalTimeoutRef.current);
      }
    };
  }, [email, fetchLoginThought]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/'); 
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe(); 
  }, [router]);


  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
        toast({ title: "Erreur de connexion", description: "L'email et le mot de passe sont requis.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Connexion réussie !", description: `Bienvenue, ${userCredential.user.displayName || userCredential.user.email} !` });
      router.push('/');

    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Une erreur est survenue. Veuillez réessayer.";
       if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Email ou mot de passe incorrect.";
            break;
          case 'auth/invalid-email':
            errorMessage = "L'adresse email n'est pas valide.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Trop de tentatives de connexion. Veuillez réessayer plus tard.";
            break;
          default: 
             errorMessage = "Erreur de connexion : " + (error.message || error.code);
        }
      }
      toast({ title: "Erreur de connexion", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      toast({ title: "Connexion Google réussie !", description: `Bienvenue, ${user.displayName || user.email} !`});
      router.push('/');
    } catch (error) {
      console.error("Google sign-in error:", error);
      let errorMessage = "Erreur de connexion avec Google.";
      if (error instanceof FirebaseError) {
        switch (error.code) {
            case 'auth/popup-closed-by-user':
              errorMessage = "La fenêtre de connexion Google a été fermée.";
              break;
            case 'auth/account-exists-with-different-credential':
              errorMessage = "Un compte existe déjà avec cet email mais avec une méthode de connexion différente.";
              break;
            case 'auth/popup-blocked':
                errorMessage = "La fenêtre de connexion Google a été bloquée par le navigateur. Veuillez autoriser les popups.";
                break;
            default:
              errorMessage = "Erreur Google: " + (error.message || error.code);
        }
      }
      toast({ title: "Erreur de connexion Google", description: errorMessage, variant: "destructive" });
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <SakaiLogo className="h-16 w-16 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
           <div className="mx-auto mb-4">
            <SakaiLogo className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Bienvenue sur Sakai</CardTitle>
          <CardDescription className="min-h-[40px] transition-all duration-300 text-sm"> 
            {isSubtitleLoading && !dynamicSubtitle.includes("Connectez-vous") ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : dynamicSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse Email</Label>
              <Input
                ref={emailInputRef} // Assign ref
                id="email"
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-base pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading || isGoogleLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion...</> : 'Se connecter'}
            </Button>
          </form>
          <div className="my-4 flex items-center before:flex-1 before:border-t before:border-border after:flex-1 after:border-t after:border-border">
            <p className="mx-4 text-center text-sm text-muted-foreground">OU</p>
          </div>
          <Button variant="outline" className="w-full text-lg py-3" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
            {isGoogleLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Connexion Google...</>
            ) : (
              <>
                <GoogleIcon className="mr-2 h-5 w-5" /> Se connecter avec Google
              </>
            )}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link href="/auth/signup" className="font-medium text-primary hover:underline">
              Inscrivez-vous ici
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

