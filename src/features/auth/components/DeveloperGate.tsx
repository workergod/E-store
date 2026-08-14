import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { KeyRound, MonitorCheck, Terminal } from 'lucide-react';
import { AppButton } from '../../../shared/app/AppButton';
import { settingsRepository } from '../../../repositories/SettingsRepository';
import { toast } from 'sonner';

interface Props {
  children: React.ReactNode;
}

export function DeveloperGate({ children }: Props) {
  const { user, company } = useAuthStore();
  const [password, setPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // If not developer, or if already unlocked this session, pass through
    if (user?.email !== 'workshop9283@gmail.com' || sessionStorage.getItem('dev_unlocked') === 'true') {
      setIsUnlocked(true);
    }
  }, [user]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !company?.companyId) return;

    setIsChecking(true);
    try {
      // In a real app we'd fetch this from settings, but for dev simplicity we use a secure hash check
      // For this demo, default dev password is "dev123"
      const expectedHash = await settingsRepository.hashPassword('dev123');
      const inputHash = await settingsRepository.hashPassword(password);

      if (inputHash === expectedHash) {
        toast.success('Developer access granted');
        sessionStorage.setItem('dev_unlocked', 'true');
        setIsUnlocked(true);
      } else {
        toast.error('Invalid Developer Password');
        setPassword('');
      }
    } catch (error) {
      toast.error('Authentication Error');
    } finally {
      setIsChecking(false);
    }
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 text-center border-b border-zinc-800/50 bg-black/20">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/20">
            <Terminal className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Developer Mode</h1>
          <p className="text-zinc-400 text-sm">
            Restricted environment. Please enter the master developer password to proceed.
          </p>
        </div>
        <form onSubmit={handleUnlock} className="p-8">
          <div className="space-y-6">
            <div>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-lg bg-black/40 border border-zinc-700 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                  placeholder="Enter dev password..."
                  autoFocus
                />
              </div>
            </div>
            <AppButton type="submit" className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-0" disabled={isChecking || !password.trim()}>
              {isChecking ? 'Verifying...' : 'Initialize System'}
            </AppButton>
          </div>
        </form>
      </div>
      <div className="mt-8 flex items-center gap-2 text-zinc-600 text-xs font-mono">
        <MonitorCheck className="h-4 w-4" /> E Store Pro Secure Kernel
      </div>
    </div>
  );
}
