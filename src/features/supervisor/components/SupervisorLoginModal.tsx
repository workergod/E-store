import { useState } from 'react';
import { X, Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '../../../shared/app/AppButton';
import { settingsRepository } from '../../../repositories/SettingsRepository';
import { useAuthStore } from '../../../store/authStore';
import { Role } from '../../../constants/roles';

interface Props {
  onClose: () => void;
}

export function SupervisorLoginModal({ onClose }: Props) {
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();
  const { company, user } = useAuthStore();

  const isExecutive = 
    user?.role === Role.MD || 
    user?.role === Role.OWNER || 
    (user?.role as any) === 'MD' ||
    user?.role === Role.SUPER_ADMIN || 
    user?.email === 'workshop9283@gmail.com' ||
    user?.email === 'cryodeal2023@gmail.com' ||
    user?.username === '@developeremil' ||
    user?.username === '@developeremilmd';

  const grantAccess = () => {
    toast.success('Supervisor Access Granted');
    sessionStorage.setItem('supervisor_auth', 'true');
    onClose();
    navigate('/supervisor');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !company?.companyId) return;
    
    setIsChecking(true);
    try {
      const storedHash = await settingsRepository.getSupervisorPasswordHash(company.companyId);
      
      if (!storedHash) {
        if (isExecutive) {
          toast.info("No supervisor password has been configured yet. Use 'Unlock with Executive Access' below, then set a password in Supervisor Corner settings.");
        } else {
          toast.error("Supervisor Corner has not been initialized with a password yet. Please ask the Managing Director (MD) to set it up.");
        }
        return;
      }
      
      const isValid = await settingsRepository.verifyPassword(password, storedHash);
      if (isValid) {
        grantAccess();
      } else {
        toast.error('Incorrect password');
      }
    } catch (error) {
      toast.error('Authentication error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleForgotPassword = () => {
    toast.info("For security, please contact the Managing Director or Company Owner to view or reset the supervisor password.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-border rounded-xl shadow-premium overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="relative p-6 border-b border-border bg-muted/30">
          <button 
            type="button"
            onClick={onClose} 
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center justify-center pt-4">
            <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Supervisor Access</h2>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Restricted area. Please enter the supervisor password to continue.
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-md border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter password..."
                  autoFocus
                />
              </div>
            </div>
            <AppButton type="submit" className="w-full" disabled={isChecking || !password.trim()}>
              {isChecking ? 'Verifying...' : 'Unlock Supervisor Corner'}
            </AppButton>

            {isExecutive && (
              <div className="pt-2">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink mx-2 text-[11px] text-muted-foreground uppercase">Or</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>
                <AppButton 
                  type="button" 
                  variant="outline" 
                  className="w-full border-emerald-600/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  onClick={grantAccess}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Unlock with Executive Access
                </AppButton>
              </div>
            )}
            
            <div className="text-center pt-2">
              <button 
                type="button" 
                onClick={handleForgotPassword}
                className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
              >
                Forgot Password?
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
