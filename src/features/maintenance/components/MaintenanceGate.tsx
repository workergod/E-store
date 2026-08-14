import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { maintenanceRepository, type MaintenanceSettings } from '../../../repositories/MaintenanceRepository';
import { Wrench, Clock, AlertTriangle } from 'lucide-react';
import { AppButton } from '../../../shared/app/AppButton';

interface Props {
  children: React.ReactNode;
}

export function MaintenanceGate({ children }: Props) {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Developer email - the only user allowed to bypass the gate
  const isDeveloper = user?.email === 'workshop9283@gmail.com';

  useEffect(() => {
    const unsubscribe = maintenanceRepository.subscribe((newSettings) => {
      setSettings(newSettings);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <Wrench className="h-8 w-8 text-muted-foreground mb-4 opacity-50" />
          <div className="h-4 w-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const isMaintenanceActive = settings?.isEnabled;

  // If maintenance is OFF, or user is Developer, let them in.
  if (!isMaintenanceActive || isDeveloper) {
    return (
      <>
        {isMaintenanceActive && isDeveloper && (
          <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex justify-center items-center gap-2 sticky top-0 z-[100] uppercase tracking-widest shadow-md">
            <AlertTriangle className="h-4 w-4" />
            Maintenance Mode is ACTIVE. All standard users are currently locked out.
          </div>
        )}
        {children}
      </>
    );
  }

  // Maintenance is ON, and user is NOT the developer. Show lockout screen.
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 selection:bg-emerald-500/30">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 md:p-12 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
          <Wrench className="h-10 w-10 text-emerald-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-4 font-mono">System Under Maintenance</h1>
        
        <p className="text-zinc-400 mb-8 leading-relaxed">
          {settings.message || 'We are currently performing scheduled maintenance to upgrade our systems. We will be back online shortly.'}
        </p>
        
        {settings.estimatedHours > 0 && (
          <div className="inline-flex items-center gap-3 bg-black/40 border border-zinc-800 rounded-xl px-6 py-4 mb-8">
            <Clock className="h-5 w-5 text-emerald-500" />
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Estimated Time</div>
              <div className="font-mono font-bold text-white">~ {settings.estimatedHours} Hours</div>
            </div>
          </div>
        )}
        
        <p className="text-xs text-zinc-600 font-mono">
          Thank you for your patience.
        </p>
      </div>
    </div>
  );
}
