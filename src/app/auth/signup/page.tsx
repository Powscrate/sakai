// src/app/auth/signup/page.tsx
"use client";

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { SakaiLogo } from '@/components/icons/logo';
import { Eye, EyeOff } from 'lucide-react';

const REGISTERED_USERS_KEY = 'sakaiRegisteredUsers';

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // For simulation, this will be the plain password. In a real app, hash it!
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!name.trim()) {
      toast({ title: "Erreur d'inscription", description: "Le nom est requis.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      toast({ title: "Erreur d'inscription", description: "Veuillez entrer une adresse email valide.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erreur d'inscription", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Erreur d'inscription", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const registeredUsersData = localStorage.getItem(REGISTERED_USERS_KEY);
      const registeredUsers: RegisteredUser[] = registeredUsersData ? JSON.parse(registeredUsersData) : [];

      if (registeredUsers.find(user => user.email === email)) {
        toast({ title: "Erreur d'inscription", description: "Un compte avec cet email existe déjà.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const newUser: RegisteredUser = {
        id: `user-${Date.now()}`,
        name,
        email,
        passwordHash: password, // In a real app, HASH THE PASSWORD!
      };
      registeredUsers.push(newUser);
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredUsers));

      toast({ title: "Inscription réussie !", description: "Votre compte a été créé. Vous pouvez maintenant vous connecter." });
      router.push('/auth/login');

    } catch (error) {
      console.error("Signup error:", error);
      toast({ title: "Erreur d'inscription", description: "Une erreur est survenue. Veuillez réessayer.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <SakaiLogo className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Créer un compte Sakai</CardTitle>
          <CardDescription>Rejoignez la communauté et discutez avec Sakai.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                type="text"
                placeholder="Votre nom complet"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Adresse Email</Label>
              <Input
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
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
               <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="text-base pr-10"
                />
                 <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
              {isLoading ? 'Création en cours...' : 'Créer mon compte'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="font-medium text-primary hover:underline">
              Connectez-vous ici
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
