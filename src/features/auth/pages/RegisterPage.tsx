import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Label } from '../../../shared/ui/Label';
import { useAuthStore } from "../../../store/authStore";
import { Navigate, Link } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';
import { Role } from '../../../constants/roles';
import { UserStatus } from '../../../types/User';
import { app } from '../../../firebase/config';
import { UsernameIndexRepository } from '../../../repositories/UsernameIndexRepository';
import { normalizeUsername, generateAuthEmail, formatUsername, isValidUsername, generateUsernameSuggestions } from '../../../utils/username';

export default function RegisterPage() {
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.TECHNICIAN);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || password.length < 6 || !fullName.trim()) {
      setError('Please provide a valid full name, username, and a password of at least 6 characters.');
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

      // Claim username atomically
      await UsernameIndexRepository.claimUsername(user.uid, normalized);

      // Create the User document as PENDING
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: authEmail,
        username: formatUsername(username),
        normalizedUsername: normalized,
        fullName: fullName.trim(),
        photoURL: '',
        role: role,
        status: UserStatus.PENDING,
        isApproved: false,
        permissions: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      // Force a page reload so useAuth() fetches the newly created user document
      window.location.href = '/';
      
    } catch (err: any) {
      setError(err.message || 'Failed to register account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Register Account</CardTitle>
          <CardDescription className="text-base mt-2">
            Create a new account. Approval is required before access is granted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md border border-red-200 dark:border-red-900">
                <div className="font-bold mb-1">Registration Error</div>
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
            
            <div className="space-y-2">
              <Label htmlFor="register-fullname">Full Name</Label>
              <Input 
                id="register-fullname" 
                type="text" 
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-username">Username</Label>
              <Input 
                id="register-username" 
                type="text" 
                placeholder="@username"
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
              <Label htmlFor="register-role">Requested Role</Label>
              <select 
                id="register-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                disabled={isLoading}
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={Role.ENGINEER}>Engineer</option>
                <option value={Role.TECHNICIAN}>Technician</option>
                <option value={Role.STORE_KEEPER}>Store Keeper</option>
                <option value={Role.SUPERVISOR}>Supervisor</option>
                <option value={Role.MANAGER}>Manager</option>
                <option value={Role.STAFF}>General Staff</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input 
                id="register-password" 
                type="password" 
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full mt-4">
              {isLoading ? 'Registering...' : 'Register Account'}
            </Button>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-sm text-blue-600 hover:underline">
                Already have an account? Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
