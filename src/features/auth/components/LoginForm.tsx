import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Label } from '../../../shared/ui/Label';
import { signInWithEmail, resetPassword } from '../../../firebase/auth';
import { UsernameIndexRepository } from '../../../repositories/UsernameIndexRepository';
import { normalizeUsername, generateAuthEmail } from '../../../utils/username';

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const resetSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
});

function getFriendlyAuthErrorMessage(err: any): string {
  const code = (err?.code || '').toLowerCase();
  const message = (err?.message || '').toLowerCase();

  if (
    code.includes('invalid-credential') ||
    code.includes('wrong-password') ||
    code.includes('user-not-found') ||
    code.includes('invalid-email') ||
    message.includes('invalid-credential') ||
    message.includes('wrong-password') ||
    message.includes('user-not-found')
  ) {
    return 'Invalid username or password. Please check your credentials and try again.';
  }

  if (code.includes('too-many-requests') || message.includes('too-many-requests')) {
    return 'Too many failed login attempts. Access is temporarily locked. Please wait a moment and try again.';
  }

  if (code.includes('user-disabled') || message.includes('user-disabled')) {
    return 'This account has been disabled. Please contact management.';
  }

  if (code.includes('network-request-failed') || message.includes('network')) {
    return 'Network connection error. Please check your internet connection.';
  }

  if (err?.message && !err.message.startsWith('Firebase:') && !err.message.includes('(auth/')) {
    return err.message;
  }

  return 'Invalid username or password. Please verify your details and try again.';
}

interface LoginFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const loginMethods = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema)
  });

  const resetMethods = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema)
  });

  const onLoginSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const normalized = normalizeUsername(data.username);
      const authEmail = data.username.includes('@') && data.username.includes('.')
        ? data.username
        : generateAuthEmail(normalized);

      try {
        await signInWithEmail(authEmail, data.password);
      } catch (firstErr: any) {
        // Smart fallback: If user entered 'emilmd' instead of 'developeremilmd', or vice-versa
        const errStr = (firstErr?.code || firstErr?.message || '').toLowerCase();
        if (errStr.includes('invalid-credential') || errStr.includes('user-not-found')) {
          if (!normalized.startsWith('developer')) {
            try {
              await signInWithEmail(generateAuthEmail(`developer${normalized}`), data.password);
              sessionStorage.setItem('cryodeal_welcome_pending', 'true');
              onSuccess();
              return;
            } catch {
              // Ignore fallback failure and throw original error
            }
          } else if (normalized.startsWith('developer')) {
            try {
              await signInWithEmail(generateAuthEmail(normalized.replace(/^developer/, '')), data.password);
              sessionStorage.setItem('cryodeal_welcome_pending', 'true');
              onSuccess();
              return;
            } catch {
              // Ignore fallback failure
            }
          }
        }
        throw firstErr;
      }
      sessionStorage.setItem('cryodeal_welcome_pending', 'true');
      onSuccess();
    } catch (err: any) {
      onError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: z.infer<typeof resetSchema>) => {
    setIsLoading(true);
    try {
      const normalized = normalizeUsername(data.username);
      const authEmail = data.username.includes('@') && data.username.includes('.')
        ? data.username
        : generateAuthEmail(normalized);
      await resetPassword(authEmail);
      setResetSent(true);
      onError(''); // clear errors
    } catch (err: any) {
      onError(getFriendlyAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
          Password reset link sent! (Check your developer console if intercepting emails).
        </p>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            setResetSent(false);
            setIsForgotPassword(false);
            resetMethods.reset();
          }}
        >
          Back to Login
        </Button>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <form onSubmit={resetMethods.handleSubmit(onResetSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-username">Username</Label>
          <Input 
            id="reset-username" 
            type="text" 
            placeholder="@username" 
            {...resetMethods.register('username')}
            disabled={isLoading}
          />
          {resetMethods.formState.errors.username && (
            <p className="text-sm text-red-500">{resetMethods.formState.errors.username.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Processing...' : 'Send Reset Link'}
        </Button>

        <Button 
          variant="ghost" 
          className="w-full text-muted-foreground" 
          type="button"
          onClick={() => {
            setIsForgotPassword(false);
            onError('');
          }}
          disabled={isLoading}
        >
          Back to login
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={loginMethods.handleSubmit(onLoginSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input 
          id="username" 
          type="text" 
          placeholder="@username" 
          {...loginMethods.register('username')}
          disabled={isLoading}
        />
        {loginMethods.formState.errors.username && (
          <p className="text-sm text-red-500">{loginMethods.formState.errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Button 
            variant="link" 
            className="px-0 font-normal h-auto text-sm" 
            type="button"
            onClick={() => {
              setIsForgotPassword(true);
              onError('');
            }}
          >
            Forgot password?
          </Button>
        </div>
        <Input 
          id="password" 
          type="password" 
          {...loginMethods.register('password')}
          disabled={isLoading}
        />
        {loginMethods.formState.errors.password && (
          <p className="text-sm text-red-500">{loginMethods.formState.errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Sign In'}
      </Button>

      <div className="text-center mt-4">
        <Link to="/register" className="text-sm text-blue-600 hover:underline">
          Don't have an account? Register here
        </Link>
      </div>
    </form>
  );
}
