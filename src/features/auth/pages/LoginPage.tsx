import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../shared/ui/Card';
import { LoginForm } from '../components/LoginForm';
import { GoogleLoginButton } from '../components/GoogleLoginButton';
import { useAuthStore } from "../../../store/authStore";
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-zinc-200 dark:border-zinc-800">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xl">E</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">EStore Pro</CardTitle>
          <CardDescription>
            Enter your credentials to access your company dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}
          
          <GoogleLoginButton 
            onSuccess={() => setError(null)} 
            onError={(msg) => setError(msg)} 
          />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <LoginForm 
            onSuccess={() => setError(null)} 
            onError={(msg) => setError(msg)} 
          />
        </CardContent>
      </Card>
    </div>
  );
}
