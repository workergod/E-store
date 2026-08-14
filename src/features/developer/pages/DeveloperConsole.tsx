import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { AppCard } from '../../../shared/app/AppCard';
import { AppButton } from '../../../shared/app/AppButton';
import { loginHistoryRepository } from '../../../repositories/LoginHistoryRepository';
import { userRepository } from '../../../repositories/UserRepository';
import { settingsRepository } from '../../../repositories/SettingsRepository';
import { useAuthStore } from '../../../store/authStore';
import { Terminal, Activity, KeyRound, Settings, Scale, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function DeveloperConsole() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'SYSTEM' | 'LEGAL' | 'SECURITY'>('AUDIT');
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newDevPassword, setNewDevPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    // Strict enforcement: Only the developer can be here, and they must have passed the DeveloperGate
    if (user?.email !== 'workshop9283@gmail.com' || sessionStorage.getItem('dev_unlocked') !== 'true') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const logs = await loginHistoryRepository.getAllHistory();
      setAuditLog(logs);
    } catch (error) {
      console.error('Failed to fetch dev data:', error);
      toast.error('Failed to load Developer Console data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeDevPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !newDevPassword.trim()) return;
    
    setIsSavingPassword(true);
    try {
      const hash = await settingsRepository.hashPassword(newDevPassword);
      await userRepository.updateUser(user.uid, { devPasswordHash: hash });
      toast.success('Developer password updated successfully');
      setNewDevPassword('');
    } catch (error) {
      toast.error('Failed to update developer password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-emerald-500/30">
      <PageContainer>
        <div className="flex items-center gap-3 mb-[var(--spacing-md)] text-emerald-500">
          <Terminal className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">Super Admin Console</h1>
        </div>
        <p className="text-zinc-400 mb-8 font-mono text-sm">
          // Restricted developer access. System overview and absolute control.
        </p>

        <div className="flex flex-wrap gap-4 mb-6">
          <AppButton 
            variant={activeTab === 'AUDIT' ? 'primary' : 'outline'} 
            onClick={() => setActiveTab('AUDIT')}
            className={activeTab === 'AUDIT' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0' : 'text-zinc-400 border-zinc-800 hover:text-white'}
          >
            <Activity className="h-4 w-4 mr-2" /> Audit Log
          </AppButton>
          <AppButton 
            variant={activeTab === 'SYSTEM' ? 'primary' : 'outline'} 
            onClick={() => setActiveTab('SYSTEM')}
            className={activeTab === 'SYSTEM' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0' : 'text-zinc-400 border-zinc-800 hover:text-white'}
          >
            <Settings className="h-4 w-4 mr-2" /> System Info
          </AppButton>
          <AppButton 
            variant={activeTab === 'LEGAL' ? 'primary' : 'outline'} 
            onClick={() => setActiveTab('LEGAL')}
            className={activeTab === 'LEGAL' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0' : 'text-zinc-400 border-zinc-800 hover:text-white'}
          >
            <Scale className="h-4 w-4 mr-2" /> Legal & Licenses
          </AppButton>
          <AppButton 
            variant={activeTab === 'SECURITY' ? 'primary' : 'outline'} 
            onClick={() => setActiveTab('SECURITY')}
            className={activeTab === 'SECURITY' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0' : 'text-zinc-400 border-zinc-800 hover:text-white'}
          >
            <KeyRound className="h-4 w-4 mr-2" /> Change Dev Password
          </AppButton>
        </div>

        <AppCard className="overflow-hidden bg-zinc-900 border-zinc-800">
          {isLoading ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-sm">Fetching system records...</div>
          ) : activeTab === 'AUDIT' ? (
            <div>
              {auditLog.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 font-mono text-sm">No login history found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left font-mono">
                    <thead className="bg-black/40 text-zinc-400">
                      <tr>
                        <th className="px-6 py-4 font-medium border-b border-zinc-800">Timestamp</th>
                        <th className="px-6 py-4 font-medium border-b border-zinc-800">User ID</th>
                        <th className="px-6 py-4 font-medium border-b border-zinc-800">IP Address</th>
                        <th className="px-6 py-4 font-medium border-b border-zinc-800">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 bg-zinc-900/50 text-zinc-300">
                      {auditLog.map(log => (
                        <tr key={log.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">{log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}</td>
                          <td className="px-6 py-4 truncate max-w-[200px] text-zinc-400">{log.uid}</td>
                          <td className="px-6 py-4">{log.ipAddress}</td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${log.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                               {log.status}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : activeTab === 'SYSTEM' ? (
            <div className="p-8">
              <h3 className="text-lg font-bold mb-6 text-emerald-500 font-mono">System Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-black/40 border border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Environment</div>
                  <div className="font-mono text-sm">Production</div>
                </div>
                <div className="p-4 rounded-lg bg-black/40 border border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Database</div>
                  <div className="font-mono text-sm">Firebase Cloud Firestore</div>
                </div>
                <div className="p-4 rounded-lg bg-black/40 border border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Auth Provider</div>
                  <div className="font-mono text-sm">Firebase Authentication</div>
                </div>
                <div className="p-4 rounded-lg bg-black/40 border border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Version</div>
                  <div className="font-mono text-sm">E Store Pro v0.4.0 (Beta)</div>
                </div>
              </div>
            </div>
          ) : activeTab === 'LEGAL' ? (
            <div className="p-8">
              <h3 className="text-lg font-bold mb-6 text-emerald-500 font-mono">Legal & Compliance</h3>
              <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
                <p>E Store Pro Software License.</p>
                <p>This system is intellectual property and cannot be distributed without explicit authorization from the primary developer.</p>
                <p>All data processed within this platform is subject to the terms of service and strict privacy guidelines. Unauthorized access attempts are actively monitored and logged in the Developer Audit trail.</p>
              </div>
            </div>
          ) : (
            <div className="p-8 max-w-md">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-500">
                <KeyRound className="h-5 w-5" /> Change Dev Password
              </h3>
              <p className="text-zinc-400 text-sm mb-6">
                Update the master developer password. This will instantly lock all future Dev sessions until the new password is provided.
              </p>
              <form onSubmit={handleChangeDevPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-300">New Password</label>
                  <input
                    type="password"
                    value={newDevPassword}
                    onChange={e => setNewDevPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full h-10 px-3 rounded-md border border-zinc-700 bg-black/40 text-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    required
                  />
                </div>
                <AppButton type="submit" disabled={isSavingPassword || !newDevPassword.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 w-full">
                  <Save className="h-4 w-4 mr-2" /> {isSavingPassword ? 'Saving...' : 'Save New Password'}
                </AppButton>
              </form>
            </div>
          )}
        </AppCard>
      </PageContainer>
    </div>
  );
}
