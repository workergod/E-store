
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { signOut } from '../../../firebase/auth';
import { useLocation } from 'react-router-dom';

export default function AccessDeniedPage() {
  const location = useLocation();
  const customMessage = location.state?.message;

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-red-200 dark:border-red-900">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-500">Access Denied</CardTitle>
          <CardDescription className="text-base mt-2">
            You do not have permission to access this application.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          {customMessage ? (
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{customMessage}</p>
          ) : (
            <p>
              This account is either unauthorized, disabled, or belongs to a domain that is not registered with EStore Pro.
            </p>
          )}
          <p className="mt-2">
            If you believe this is an error, please contact your company administrator.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign Out & Return to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
