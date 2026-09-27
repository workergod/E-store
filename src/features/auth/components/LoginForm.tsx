import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Label } from '../../../shared/ui/Label';
import { signInWithEmail, resetPassword } from '../../../firebase/auth';
import { UsernameIndexRepository } from '../../../repositories/UsernameIndexRepository';
import { normalizeUsername } from '../../../utils/username';

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const resetSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
});

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
      let authEmail = await UsernameIndexRepository.resolveUsernameToAuthEmail(normalized);
      
      // Fallback for developer account in case Firestore rules blocked index creation
      if (!authEmail && normalized === 'developeremil') {
        authEmail = 'developeremil@estorepro.internal';
      }

      if (!authEmail) {
        throw new Error('Invalid username or password.');
      }
      await signInWithEmail(authEmail, data.password);
      onSuccess();
    } catch (err: any) {
      onError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const onResetSubmit = async (data: z.infer<typeof resetSchema>) => {
    setIsLoading(true);
    try {
      const normalized = normalizeUsername(data.username);
      const authEmail = await UsernameIndexRepository.resolveUsernameToAuthEmail(normalized);
      if (!authEmail) {
        throw new Error('Username not found.');
      }
      await resetPassword(authEmail);
      setResetSent(true);
      onError(''); // clear errors
    } catch (err: any) {
      onError(err.message || 'Failed to send reset email.');
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
    </form>
  );
}
