import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, Sparkles, ArrowRight, LayoutDashboard, Package, 
  ArrowUpRight, ClipboardList, ShieldCheck, X 
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { AppButton } from '../app/AppButton';

interface WelcomeScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeScreen({ isOpen, onClose }: WelcomeScreenProps) {
  const navigate = useNavigate();
  const { user, company } = useAuthStore();

  const roleStr = (user?.role || '').toString();
  const roleLower = roleStr.toLowerCase();
  const designationLower = ((user as any)?.designation || '').toLowerCase();
  const usernameLower = (user?.username || '').toLowerCase();
  
  // Specifically detect Managing Director / Executive role
  const isMD = roleLower === 'md' 
    || roleLower === 'owner' 
    || roleLower === 'superadmin' 
    || designationLower.includes('managing director') 
    || designationLower.includes('md') 
    || usernameLower.includes('md');

  // Friendly time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Play gentle welcome chime via Web Audio API
  useEffect(() => {
    if (!isOpen) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.04, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.8);
      });
    } catch {
      // Autoplay rules handled
    }
  }, [isOpen]);

  // Handle Enter/Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const quickNavItems = [
    {
      title: 'Operations Dashboard',
      description: 'Real-time overview, company KPIs and alerts',
      icon: LayoutDashboard,
      path: '/',
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'Inventory & Catalog',
      description: 'Real-time stock levels, barcodes & tracking',
      icon: Package,
      path: '/products',
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
    },
    {
      title: 'Issue & Returns',
      description: 'Technician allocations & material returns',
      icon: ArrowUpRight,
      path: '/issue',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    },
    {
      title: 'Transaction Audit Log',
      description: 'Official verified issue & return records',
      icon: ClipboardList,
      path: '/transaction-log',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-xl"
          />

          {/* Ambient Lighting Orbs */}
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            <motion.div
              animate={{ 
                scale: [1, 1.15, 1],
                opacity: [0.15, 0.25, 0.15]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-400 blur-3xl opacity-20"
            />
          </div>

          {/* Main Card Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-3xl p-6 sm:p-8 z-10 overflow-hidden"
          >
            {/* Top decorative gradient border line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-400" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header / Logo section */}
            <div className="text-center flex flex-col items-center">
              {/* Logo with circular pulsing halo */}
              <div className="relative mb-5 flex items-center justify-center">
                {/* Circular ambient glow */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.35, 0.55, 0.35]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -inset-3 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-amber-400 blur-md opacity-40 pointer-events-none"
                />
                {/* Circular rotating accent ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-400 opacity-60 pointer-events-none"
                />
                {/* Clean round circular white logo container */}
                <div className="relative h-20 w-20 rounded-full bg-white p-3 flex items-center justify-center shadow-xl border border-border overflow-hidden z-10">
                  <img src="/logo.jpg" alt="Cryodeal Logo" className="w-full h-full object-contain" />
                </div>
              </div>

              {/* MD or Role Badge */}
              {isMD ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 mb-3 shadow-xs"
                >
                  <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span>MANAGING DIRECTOR • EXECUTIVE ACCESS</span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-3 shadow-xs"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{roleStr || 'VERIFIED USER'} • WORKSPACE</span>
                </motion.div>
              )}

              {/* Title & Personalized Greeting */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground"
              >
                Welcome to <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">{company?.companyName || 'Cryodeal'}</span>
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-sm text-muted-foreground mt-1.5 max-w-lg"
              >
                {getGreeting()}, <span className="font-semibold text-foreground">{user?.fullName || user?.username || (isMD ? 'Managing Director' : 'Staff')}</span>!{' '}
                {isMD 
                  ? 'All operations, inventory tracking, financial logs, and staff authorizations are ready for your management.'
                  : 'Your inventory, store requisitions, and daily operations are active and ready.'}
              </motion.p>
            </div>

            {/* Quick launch grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6"
            >
              {quickNavItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(item.path);
                    }}
                    className="flex items-start gap-3 p-3 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/60 hover:border-primary/40 transition-all text-left group cursor-pointer"
                  >
                    <div className={`p-2.5 rounded-xl border shrink-0 transition-transform group-hover:scale-105 ${item.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>{item.title}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </motion.div>

            {/* Bottom Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mt-6 pt-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Cryodeal v0.4.0 • Enterprise Inventory Management</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <AppButton
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 h-11 text-sm font-semibold shadow-md group"
                >
                  <span>Enter Dashboard</span>
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </AppButton>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
