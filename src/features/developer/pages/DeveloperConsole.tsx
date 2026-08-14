import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { AppCard } from '../../../shared/app/AppCard';
import { AppCard } from '../../../shared/app/AppCard';
import { loginHistoryRepository } from '../../../repositories/LoginHistoryRepository';
import { userRepository } from '../../../repositories/UserRepository';
import { settingsRepository } from '../../../repositories/SettingsRepository';
import { maintenanceRepository, MaintenanceSettings } from '../../../repositories/MaintenanceRepository';
import { useAuthStore } from '../../../store/authStore';
import { Terminal, Activity, KeyRound, Settings, Scale, Save, Wrench } from 'lucide-react';
import { toast } from 'sonner';

export default function DeveloperConsole() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'AUDIT' | 'SYSTEM' | 'LEGAL' | 'SECURITY' | 'MAINTENANCE'>('MAINTENANCE');
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [maintenanceSettings, setMaintenanceSettings] = useState<MaintenanceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newDevPassword, setNewDevPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [selectedLog, setSelectedLog] = useState<any | null>(null);

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
      
      const mSettings = await maintenanceRepository.getSettings();
      setMaintenanceSettings(mSettings);
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

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintenanceSettings) return;
    
    try {
      await maintenanceRepository.updateSettings(maintenanceSettings);
      toast.success('Maintenance mode settings updated successfully');
    } catch (error) {
      toast.error('Failed to update maintenance settings');
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
          <button 
            onClick={() => setActiveTab('AUDIT')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 py-2 transition-all ${activeTab === 'AUDIT' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-md' : 'bg-transparent text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-900'}`}
          >
            <Activity className="h-4 w-4 mr-2" /> Audit Log
          </button>
          <button 
            onClick={() => setActiveTab('MAINTENANCE')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 py-2 transition-all ${activeTab === 'MAINTENANCE' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-md' : 'bg-transparent text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-900'}`}
          >
            <Wrench className="h-4 w-4 mr-2" /> Maintenance Mode
          </button>
          <button 
            onClick={() => setActiveTab('SYSTEM')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 py-2 transition-all ${activeTab === 'SYSTEM' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-md' : 'bg-transparent text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-900'}`}
          >
            <Settings className="h-4 w-4 mr-2" /> System Info
          </button>
          <button 
            onClick={() => setActiveTab('LEGAL')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 py-2 transition-all ${activeTab === 'LEGAL' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-md' : 'bg-transparent text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-900'}`}
          >
            <Scale className="h-4 w-4 mr-2" /> Legal & Licenses
          </button>
          <button 
            onClick={() => setActiveTab('SECURITY')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 py-2 transition-all ${activeTab === 'SECURITY' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-md' : 'bg-transparent text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-900'}`}
          >
            <KeyRound className="h-4 w-4 mr-2" /> Change Dev Password
          </button>
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
                        <tr 
                          key={log.id} 
                          className="hover:bg-zinc-800/80 transition-colors cursor-pointer"
                          onClick={async () => {
                            if (log.uid && log.uid !== 'UNKNOWN') {
                              try {
                                const fullUser = await userRepository.getUser(log.uid);
                                setSelectedLog({ ...log, fullUser });
                              } catch (e) {
                                setSelectedLog(log);
                              }
                            } else {
                              setSelectedLog(log);
                            }
                          }}
                        >
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
          ) : activeTab === 'MAINTENANCE' && maintenanceSettings ? (
            <div className="p-8 max-w-2xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-500 font-mono">
                <Wrench className="h-5 w-5" /> Global Maintenance Mode
              </h3>
              <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                Activating maintenance mode will immediately lock out all standard users and supervisors. Only this developer account will be able to bypass the block.
              </p>
              <form onSubmit={handleSaveMaintenance} className="space-y-6">
                
                <div className="flex items-center justify-between p-4 bg-black/40 border border-zinc-800 rounded-lg">
                  <div>
                    <div className="font-bold text-white">Enable Maintenance Lockout</div>
                    <div className="text-xs text-zinc-500 mt-1">Locks all non-developer accounts out of the system.</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={maintenanceSettings.isEnabled}
                      onChange={e => setMaintenanceSettings({...maintenanceSettings, isEnabled: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1 text-zinc-300">Estimated Duration (Hours)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={maintenanceSettings.estimatedHours}
                      onChange={e => setMaintenanceSettings({...maintenanceSettings, estimatedHours: parseFloat(e.target.value)})}
                      className="w-full h-10 px-3 rounded-md border border-zinc-700 bg-black/40 text-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-mono"
                    />
                    <p className="text-xs text-zinc-500 mt-2">Set to 0 to hide the time estimate.</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1 text-zinc-300">Lockout Message</label>
                    <textarea
                      value={maintenanceSettings.message}
                      onChange={e => setMaintenanceSettings({...maintenanceSettings, message: e.target.value})}
                      className="w-full h-32 p-3 rounded-md border border-zinc-700 bg-black/40 text-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                      placeholder="Enter the message users will see..."
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium h-10 px-6 py-2 transition-all bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-md">
                    <Save className="h-4 w-4 mr-2" /> Save Maintenance Settings
                  </button>
                </div>
              </form>
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
                  <button type="submit" disabled={isSavingPassword || !newDevPassword.trim()} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium h-10 px-4 py-2 transition-all bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-md w-full disabled:opacity-50">
                    <Save className="h-4 w-4 mr-2" /> {isSavingPassword ? 'Saving...' : 'Save New Password'}
                  </button>
                </form>
              </div>
            )}
          </AppCard>
        </PageContainer>
        
        {/* Log Details Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-6 border-b border-zinc-800 bg-black/40 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-emerald-500" /> System Event Details
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1 font-mono">{selectedLog.id}</p>
                </div>
                <button onClick={() => setSelectedLog(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                  <div>
                    <div className="text-zinc-500 uppercase tracking-widest text-[10px] mb-1">Status</div>
                    <div className={`font-bold ${selectedLog.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedLog.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 uppercase tracking-widest text-[10px] mb-1">Timestamp</div>
                    <div className="text-zinc-200">
                      {selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate().toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 uppercase tracking-widest text-[10px] mb-1">IP Address</div>
                    <div className="text-zinc-200">{selectedLog.ipAddress || 'Unknown'}</div>
                  </div>
                  {selectedLog.reason && (
                    <div className="col-span-2">
                      <div className="text-zinc-500 uppercase tracking-widest text-[10px] mb-1">Failure Reason</div>
                      <div className="text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                        {selectedLog.reason}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-zinc-800 pt-6">
                  <h4 className="text-emerald-500 font-mono text-sm font-bold mb-4">User Information</h4>
                  {selectedLog.fullUser ? (
                    <div className="bg-black/40 rounded-lg border border-zinc-800 p-4 space-y-3 font-mono text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Name:</span>
                        <span className="text-zinc-200">{selectedLog.fullUser.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Email:</span>
                        <span className="text-zinc-200">{selectedLog.fullUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Role:</span>
                        <span className="text-zinc-200">{selectedLog.fullUser.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Current Status:</span>
                        <span className="text-zinc-200">{selectedLog.fullUser.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Approved:</span>
                        <span className="text-zinc-200">{selectedLog.fullUser.isApproved ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">User ID:</span>
                        <span className="text-zinc-500 text-xs">{selectedLog.uid}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/40 rounded-lg border border-zinc-800 p-4 font-mono text-sm">
                      <div className="text-zinc-500 mb-2">Basic Info (Full record not found)</div>
                      <div className="text-zinc-300 break-all">{selectedLog.uid}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
