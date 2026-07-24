import { useState } from 'react';
import { X, Lock, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AppButton } from '../../../shared/app/AppButton';
import { settingsRepository } from '../../../repositories/SettingsRepository';
import { useAuthStore } from '../../../store/authStore';

interface Props {
  onClose: () => void;
}

export function SupervisorLoginModal({ onClose }: Props) {
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const navigate = useNavigate();
  const { company } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !company?.companyId) return;
    
    setIsChecking(true);
    try {
      const storedHash = await settingsRepository.getSupervisorPasswordHash(company.companyId);
      const inputHash = await settingsRepository.hashPassword(password);
      
      // If there's no stored hash yet, default is 'admin'
      const defaultHash = await settingsRepository.hashPassword('admin');
      
      if (inputHash === (storedHash || defaultHash)) {
        toast.success('Supervisor Access Granted');
        // Store temporary session flag in sessionStorage
        sessionStorage.setItem('supervisor_auth', 'true');
        onClose();
        navigate('/supervisor');
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
    window.location.href = "mailto:alexanderabraham1987@gmail.com?subject=Reset Supervisor Password&body=Hello Alexander,%0D%0A%0D%0APlease reset the supervisor password for my E Store Pro account.%0D%0A%0D%0ACompany ID: " + (company?.companyId || '');
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
