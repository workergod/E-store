import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Label } from '../../../shared/ui/Label';
import { signInWithEmail, resetPassword } from '../../../firebase/auth';

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      if (isForgotPassword) {
        await resetPassword(data.email);
        setResetSent(true);
        onError(''); // clear errors
      } else {
        if (!data.password) {
          throw new Error('Password is required');
        }
        await signInWithEmail(data.email, data.password);
        onSuccess();
      }
    } catch (err: any) {
      if (isForgotPassword) {
        onError(err.message || 'Failed to send reset email.');
      } else {
        onError(err.message || 'Failed to sign in. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
          Password reset email sent! Check your inbox.
        </p>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => {
            setResetSent(false);
            setIsForgotPassword(false);
          }}
        >
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="m@example.com" 
          {...register('email')}
          disabled={isLoading}
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>

      {!isForgotPassword && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Button 
              variant="link" 
              className="px-0 font-normal h-auto text-sm" 
              type="button"
              onClick={() => setIsForgotPassword(true)}
            >
              Forgot password?
            </Button>
          </div>
          <Input 
            id="password" 
            type="password" 
            {...register('password')}
            disabled={isLoading}
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Processing...' : isForgotPassword ? 'Send Reset Link' : 'Sign In'}
      </Button>

      {isForgotPassword && (
        <Button 
          variant="ghost" 
          className="w-full text-muted-foreground" 
          type="button"
          onClick={() => setIsForgotPassword(false)}
          disabled={isLoading}
        >
          Back to login
        </Button>
      )}
    </form>
  );
}
