// src/app/auth/login/page.tsx
"use client";

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import useLocalStorage from '@/hooks/use-local-storage';
import { SakaiLogo } from '@/components/icons/logo';
import { Eye, EyeOff } from 'lucide-react';

const REGISTERED_USERS_KEY = 'sakaiRegisteredUsers';
const CURRENT_USER_KEY = 'sakaiSimulatedUser';

interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // Plain password for simulation
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useLocalStorage<CurrentUser | null>(CURRENT_USER_KEY, null);

  useEffect(() => {
    if (currentUser) {
      router.push('/'); // Redirect if already logged in
    }
  }, [currentUser, router]);


  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.trim() || !password.trim()) {
        toast({ title: "Erreur de connexion", description: "L'email et le mot de passe sont requis.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    try {
      const registeredUsersData = localStorage.getItem(REGISTERED_USERS_KEY);
      const registeredUsers: RegisteredUser[] = registeredUsersData ? JSON.parse(registeredUsersData) : [];

      const foundUser = registeredUsers.find(user => user.email === email);

      if (!foundUser) {
        toast({ title: "Erreur de connexion", description: "Aucun compte trouvé avec cet email.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // SIMULATED PASSWORD CHECK
      if (foundUser.passwordHash !== password) {
        toast({ title: "Erreur de connexion", description: "Mot de passe incorrect.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      
      const userToStore: CurrentUser = {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
      };
      setCurrentUser(userToStore); // This uses useLocalStorage to set the current user

      toast({ title: "Connexion réussie !", description: `Bienvenue, ${foundUser.name} !` });
      router.push('/');

    } catch (error) {
      console.error("Login error:", error);
      toast({ title: "Erreur de connexion", description: "Une erreur est survenue. Veuillez réessayer.", variant: "destructive" });
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
          <CardTitle className="text-3xl font-bold">Bienvenue sur Sakai</CardTitle>
          <CardDescription>Connectez-vous pour discuter avec votre assistant IA.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
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
            <Button type="submit" className="w-full text-lg py-3" disabled={isLoading}>
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>
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
