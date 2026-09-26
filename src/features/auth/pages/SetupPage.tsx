import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Label } from '../../../shared/ui/Label';
import { useAuthStore } from "../../../store/authStore";
import { Navigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';
import { Role } from '../../../constants/roles';
import { UserStatus } from '../../../types/User';
import { app } from '../../../firebase/config';
import { UsernameIndexRepository } from '../../../repositories/UsernameIndexRepository';
import { normalizeUsername, generateAuthEmail, formatUsername, isValidUsername, generateUsernameSuggestions } from '../../../utils/username';

export default function SetupPage() {
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || password.length < 6) {
      setError('Please provide a valid username and a password of at least 6 characters.');
      setSuggestions([]);
      return;
    }

    if (!isValidUsername(username)) {
      setError('Username must be 3-30 characters long and contain only lowercase letters, numbers, underscores, and hyphens.');
      setSuggestions([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const normalized = normalizeUsername(username);
      const authEmail = generateAuthEmail(normalized);

      // Check if username is available
      const isAvailable = await UsernameIndexRepository.isUsernameAvailable(normalized);
      if (!isAvailable) {
         setError(`@${normalized} is already in use. Please choose another username.`);
         setSuggestions(generateUsernameSuggestions(normalized));
         setIsLoading(false);
         return;
      }

      const auth = getAuth(app);
      // Create user directly using the generated Auth Email & Password
      const result = await createUserWithEmailAndPassword(auth, authEmail, password);
      const user = result.user;

      // Check if user already exists
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setError('A user already exists for this account. Setup is only for the initial deployment.');
        return;
      }

      // Claim username atomically
      await UsernameIndexRepository.claimUsername(user.uid, normalized);

      // Create the SuperAdmin document
      await setDoc(userRef, {
        uid: user.uid,
        email: authEmail,
        username: formatUsername(username),
        normalizedUsername: normalized,
        fullName: 'System Administrator',
        photoURL: '',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        permissions: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      // Force a page reload so useAuth() fetches the newly created user document
      window.location.href = '/';
      
    } catch (err: any) {
      setError(err.message || 'Failed to initialize setup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-blue-200 dark:border-blue-900">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-500">System Setup</CardTitle>
          <CardDescription className="text-base mt-2">
            Initialize the application by creating the SuperAdmin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">
                <div className="font-bold mb-1">Username already used</div>
                {error}
                {suggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="font-medium text-red-600 dark:text-red-400 mb-2">Suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => {
                            setUsername(suggestion);
                            setError(null);
                            setSuggestions([]);
                          }}
                          className="px-2 py-1 text-xs bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="text-sm text-muted-foreground mb-4">
              Warning: This action should only be performed once by the software owner. This will be the permanent SuperAdmin.
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="setup-username">Admin Username</Label>
              <Input 
                id="setup-username" 
                type="text" 
                placeholder="@admin"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                  setSuggestions([]);
                }}
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="setup-password">Admin Password</Label>
              <Input 
                id="setup-password" 
                type="password" 
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-4">
              {isLoading ? 'Initializing...' : 'Create SuperAdmin Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
