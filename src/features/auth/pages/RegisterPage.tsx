import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Label } from '../../../shared/ui/Label';
import { useAuthStore } from "../../../store/authStore";
import { Navigate, Link } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/firestore';
import { Role } from '../../../constants/roles';
import { UserStatus } from '../../../types/User';
import { app } from '../../../firebase/config';
import { UsernameIndexRepository } from '../../../repositories/UsernameIndexRepository';
import { normalizeUsername, generateAuthEmail, formatUsername, isValidUsername, generateUsernameSuggestions } from '../../../utils/username';

function getFriendlyRegisterErrorMessage(err: any, username: string): { message: string; suggestions: string[] } {
  const code = (err?.code || '').toLowerCase();
  const rawMessage = (err?.message || '').toLowerCase();
  const normalized = normalizeUsername(username);

  if (
    code.includes('email-already-in-use') ||
    code.includes('credential-already-in-use') ||
    rawMessage.includes('email-already-in-use') ||
    rawMessage.includes('email already in use')
  ) {
    return {
      message: `The username or email "@${normalized}" is already registered. Please choose another username or sign in with your existing account.`,
      suggestions: generateUsernameSuggestions(normalized)
    };
  }

  if (code.includes('weak-password') || rawMessage.includes('weak-password') || rawMessage.includes('at least 6 characters')) {
    return {
      message: 'The password is too weak. Please use at least 6 characters with letters and numbers.',
      suggestions: []
    };
  }

  if (code.includes('invalid-email') || rawMessage.includes('invalid-email')) {
    return {
      message: 'Invalid username or email format. Please check your username and try again.',
      suggestions: []
    };
  }

  if (code.includes('too-many-requests') || rawMessage.includes('too-many-requests')) {
    return {
      message: 'Too many registration requests. Please wait a moment and try again.',
      suggestions: []
    };
  }

  if (code.includes('network-request-failed') || rawMessage.includes('network')) {
    return {
      message: 'Network connection failed. Please check your internet connection.',
      suggestions: []
    };
  }

  let cleanMsg = err?.message || 'Failed to register account.';
  if (cleanMsg.startsWith('Firebase:') || cleanMsg.includes('(auth/')) {
    cleanMsg = cleanMsg.replace(/^Firebase:\s*/i, '').replace(/\(auth\/[a-z0-9-]+\)\.?/gi, '').trim();
    if (!cleanMsg || cleanMsg === 'Error .') {
      cleanMsg = 'Failed to register account. Please verify your details and try again.';
    }
  }

  return {
    message: cleanMsg,
    suggestions: []
  };
}

export default function RegisterPage() {
  const { isAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(Role.TECHNICIAN);
  const [isSuccess, setIsSuccess] = useState(false);

  if (isAuthenticated && !isSuccess) {
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

      // Check if username is available, ignoring permission errors for undeployed rules
      let isAvailable = true;
      try {
        isAvailable = await UsernameIndexRepository.isUsernameAvailable(normalized);
      } catch (err: any) {
        if (err?.code !== 'permission-denied') {
          throw err;
        }
        console.warn("Skipping username check due to pending rule deployment");
      }

      if (!isAvailable) {
         setError(`The username "@${normalized}" is already registered. Please choose another username or sign in with your existing account.`);
         setSuggestions(generateUsernameSuggestions(normalized));
         setIsLoading(false);
         return;
      }

      const auth = getAuth(app);
      // Create user directly using the generated Auth Email & Password
      const result = await createUserWithEmailAndPassword(auth, authEmail, password);
      const user = result.user;

      // Get default company
      let defaultCompanyId = 'company_Zu6sHXTq'; // Fallback to actual live company ID if rules block read
      try {
        const companySnap = await getDocs(collection(db, 'companies'));
        if (!companySnap.empty) {
          defaultCompanyId = companySnap.docs[0].id;
        }
      } catch (err: any) {
        console.warn("Could not fetch companies, falling back to live company ID");
      }

      // Claim username atomically (suppress error if rules aren't deployed)
      try {
        await UsernameIndexRepository.claimUsername(user.uid, normalized);
      } catch (err: any) {
        if (err?.code !== 'permission-denied') {
          throw err;
        }
        console.warn("Skipping username claim due to pending rule deployment");
      }

      // Create the User document (MD / Owner auto-approved without needing developer approval)
      const isAutoApproved = role === Role.MD || role === Role.OWNER;
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: authEmail,
        username: formatUsername(username),
        normalizedUsername: normalized,
        fullName: fullName.trim(),
        photoURL: '',
        role: role,
        companyId: defaultCompanyId,
        status: isAutoApproved ? UserStatus.ACTIVE : UserStatus.PENDING,
        isApproved: isAutoApproved,
        permissions: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        hasSeenWelcome: false,
      });

      sessionStorage.setItem('cryodeal_is_new_user', 'true');

      // Sign out immediately so they don't get auto-logged in and hit access-denied
      await auth.signOut();
      
      // Show success screen
      setIsSuccess(true);
      
    } catch (err: any) {
      console.error("Registration error:", err);
      const friendly = getFriendlyRegisterErrorMessage(err, username);
      setError(friendly.message);
      setSuggestions(friendly.suggestions);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-2xl bg-white p-2 flex items-center justify-center shadow-md border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <img src="/logo.jpg" alt="Cryodeal Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Register Account</CardTitle>
          <CardDescription className="text-base mt-2">
            Create a new account. Approval is required before access is granted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="space-y-6 text-center py-4">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold">Registration Successful!</h3>
              {role === Role.MD || role === Role.OWNER ? (
                <p className="text-muted-foreground text-sm">
                  Your executive account has been created and pre-approved with full permissions. You can log in right away!
                </p>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    Your account has been created successfully. However, approval is needed by MD or Manager before you can access the application.
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Please contact management to activate your account.
                  </p>
                </>
              )}
              <div className="pt-4">
                <Link to="/login">
                  <Button className="w-full">Return to Login</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="p-3.5 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/60 shadow-xs animate-in fade-in">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-red-700 dark:text-red-300">
                    <span>⚠️</span>
                    <span>Registration Notice</span>
                  </div>
                  <div className="leading-relaxed">{error}</div>

                  {error.includes('already registered') && (
                    <div className="mt-2 text-xs">
                      <Link to="/login" className="font-semibold text-primary hover:underline inline-flex items-center gap-1">
                        Already have an account? Sign In here →
                      </Link>
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-red-200/60 dark:border-red-800/60">
                      <p className="font-semibold text-xs text-red-700 dark:text-red-300 mb-2">
                        Available Username Suggestions (click to select):
                      </p>
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
                            className="px-2.5 py-1 text-xs font-mono font-bold bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer shadow-xs"
                            title={`Click to use @${suggestion}`}
                          >
                            @{suggestion}
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
                  <option value={Role.MD}>MD (Managing Director)</option>
                  <option value={Role.MANAGER}>Manager</option>
                  <option value={Role.ENGINEER}>Engineer</option>
                  <option value={Role.TECHNICIAN}>Technician</option>
                  <option value={Role.STORE_KEEPER}>Store Keeper</option>
                  <option value={Role.SUPERVISOR}>Supervisor</option>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
