import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role check
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking admin role:', error);
      }
      
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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

      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente',
      });

      return { data };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al iniciar sesión',
        variant: 'destructive',
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        let message = error.message;
        if (error.message.includes('already registered')) {
          message = 'Este email ya está registrado';
        }
        toast({
          title: 'Error de registro',
          description: message,
          variant: 'destructive',
        });
        return { error };
      }

      toast({
        title: '¡Registro exitoso!',
        description: 'Tu cuenta ha sido creada',
      });

      return { data };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al registrarse',
        variant: 'destructive',
      });
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    toast({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión correctamente',
    });
  };

  return {
    user,
    session,
    isAdmin,
    loading,
    signIn,
    signUp,
    signOut,
  };
}
