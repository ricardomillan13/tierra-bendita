import { useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [user, setUser]           = useState<User | null>(null);
  const [session, setSession]     = useState<Session | null>(null);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [isSeller, setIsSeller]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [rolesReady, setRolesReady] = useState(false);
  const { toast } = useToast();
  const checkingRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkRoles(session.user.id);
        } else {
          setIsAdmin(false);
          setIsSeller(false);
          setRolesReady(true);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkRoles(session.user.id);
      } else {
        setRolesReady(true);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkRoles = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking roles:', error);
    }

    const roles = (data ?? []).map((r: any) => r.role);
    setIsAdmin(roles.includes('admin'));
    setIsSeller(roles.includes('seller'));
  } catch (error) {
    console.error('Error checking roles:', error);
    setIsAdmin(false);
    setIsSeller(false);
  } finally {
    setRolesReady(true);
    setLoading(false);
  }
};

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          title: 'Error de inicio de sesión',
          description: error.message === 'Invalid login credentials'
            ? 'Email o contraseña incorrectos'
            : error.message,
          variant: 'destructive',
        });
        return { error };
      }
      toast({ title: '¡Bienvenido!', description: 'Has iniciado sesión correctamente' });
      return { data };
    } catch (error: any) {
      toast({ title: 'Error', description: 'Ocurrió un error al iniciar sesión', variant: 'destructive' });
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) {
        let message = error.message;
        if (error.message.includes('already registered')) message = 'Este email ya está registrado';
        toast({ title: 'Error de registro', description: message, variant: 'destructive' });
        return { error };
      }
      toast({ title: '¡Registro exitoso!', description: 'Tu cuenta ha sido creada' });
      return { data };
    } catch (error: any) {
      toast({ title: 'Error', description: 'Ocurrió un error al registrarse', variant: 'destructive' });
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsSeller(false);
    setRolesReady(false);
    toast({ title: 'Sesión cerrada', description: 'Has cerrado sesión correctamente' });
  };

  return { user, session, isAdmin, isSeller, loading, rolesReady, signIn, signUp, signOut };
}