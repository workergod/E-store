import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { AppCard } from '../../../shared/app/AppCard';
import { AppButton } from '../../../shared/app/AppButton';
import { productRepository } from '../../../repositories/ProductRepository';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { settingsRepository } from '../../../repositories/SettingsRepository';
import { userRepository } from '../../../repositories/UserRepository';
import { loginHistoryRepository } from '../../../repositories/LoginHistoryRepository';
import { useAuthStore } from '../../../store/authStore';
import { ShieldAlert, RefreshCw, KeyRound, Save, Trash2, Package, Users, UserCheck, Shield, Activity, X } from 'lucide-react';
import { toast } from 'sonner';
import { Role } from '../../../constants/roles';
import { UserStatus } from '../../../types/User';

export default function SupervisorCorner() {
  const navigate = useNavigate();
  const { company, user } = useAuthStore();
  const companyId = company?.companyId;

  const isDeveloper = user?.email === 'workshop9283@gmail.com';

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'EMPLOYEES' | 'SETTINGS' | 'PENDING'>('PENDING');
  
  const [deletedProducts, setDeletedProducts] = useState<any[]>([]);
  const [deletedEmployees, setDeletedEmployees] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Role Selection Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForApproval, setSelectedUserForApproval] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.STAFF);

  useEffect(() => {
    if (sessionStorage.getItem('supervisor_auth') !== 'true' && !isDeveloper) {
      navigate('/');
      return;
    }
    
    if (companyId) {
      fetchData();
    }
  }, [companyId, navigate, isDeveloper]);

  const fetchData = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const allProducts = await productRepository.getAll(companyId);
      const allEmployees = await employeeRepository.getAll(companyId);
      const allUsers = await userRepository.getUsersByCompany(companyId);

      setDeletedProducts(allProducts.filter(p => p.status === 'DELETED'));
      setDeletedEmployees(allEmployees.filter(e => e.status === 'DELETED'));
      setPendingUsers(allUsers.filter(u => u.status === UserStatus.PENDING || u.status === UserStatus.PENDING_DEV_APPROVAL));

    } catch (error) {
      console.error('Failed to fetch supervisor data:', error);
      toast.error('Failed to load supervisor data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreProduct = async (id: string) => {
    if (!companyId || !user?.uid) return;
    try {
      await productRepository.update(id, { status: 'ACTIVE' }, companyId, user.uid);
      toast.success('Product restored successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to restore product');
    }
  };

  const handleRestoreEmployee = async (id: string) => {
    if (!companyId || !user?.uid) return;
    try {
      await employeeRepository.update(id, { status: 'ACTIVE' }, companyId, user.uid);
      toast.success('Employee restored successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to restore employee');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newPassword.trim()) return;
    
    setIsSavingPassword(true);
    try {
      const hash = await settingsRepository.hashPassword(newPassword);
      await settingsRepository.setSupervisorPasswordHash(companyId, hash);
      toast.success('Supervisor password updated successfully');
      setNewPassword('');
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const openApprovalModal = (pendingUser: any) => {
    setSelectedUserForApproval(pendingUser);
    setSelectedRole(Role.STAFF);
    setIsRoleModalOpen(true);
  };

  const confirmApproval = async () => {
    if (!selectedUserForApproval) return;
    
    let newStatus = UserStatus.ACTIVE;
    let isApproved = true;

    // If Supervisor is approving a Boss/Admin, escalate to Developer
    if (selectedRole === Role.ADMIN && !isDeveloper) {
      newStatus = UserStatus.PENDING_DEV_APPROVAL;
      isApproved = false;
      toast.info('Boss/Admin roles require Developer approval. Request escalated.');
    } else {
      toast.success(`User approved as ${selectedRole}`);
    }

    try {
      await userRepository.updateUser(selectedUserForApproval.uid, {
        role: selectedRole,
        status: newStatus,
        isApproved
      });
      setIsRoleModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  const declineUser = async (uid: string) => {
    try {
      await userRepository.updateUser(uid, {
        status: UserStatus.SUSPENDED,
        isApproved: false
      });
      toast.success('User has been declined and suspended.');
      fetchData();
    } catch (error) {
      toast.error('Failed to decline user');
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-[var(--spacing-md)] text-destructive">
        <ShieldAlert className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">
          {isDeveloper ? 'Developer Command Center' : 'Supervisor Corner'}
        </h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Secure restricted area for managing user access, deleted records, and system settings.
      </p>

      <div className="flex flex-wrap gap-4 mb-6">
        <AppButton 
          variant={activeTab === 'PENDING' ? 'primary' : 'outline'} 
          onClick={() => setActiveTab('PENDING')}
        >
          <UserCheck className="h-4 w-4 mr-2" /> Pending Users ({pendingUsers.length})
        </AppButton>
        <AppButton 
          variant={activeTab === 'PRODUCTS' ? 'primary' : 'outline'} 
          onClick={() => setActiveTab('PRODUCTS')}
        >
          <Package className="h-4 w-4 mr-2" /> Deleted Products ({deletedProducts.length})
        </AppButton>
        <AppButton 
          variant={activeTab === 'EMPLOYEES' ? 'primary' : 'outline'} 
          onClick={() => setActiveTab('EMPLOYEES')}
        >
          <Users className="h-4 w-4 mr-2" /> Deleted Employees ({deletedEmployees.length})
        </AppButton>
        <AppButton 
          variant={activeTab === 'SETTINGS' ? 'primary' : 'outline'} 
          onClick={() => setActiveTab('SETTINGS')}
        >
          <KeyRound className="h-4 w-4 mr-2" /> Password Settings
        </AppButton>
      </div>

      <AppCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading secure data...</div>
        ) : activeTab === 'PENDING' ? (
          <div>
            {pendingUsers.length === 0 ? (
              <div className="p-12 flex flex-col items-center text-muted-foreground">
                <Shield className="h-12 w-12 mb-4 opacity-20" />
                <p>No pending users require approval.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-muted/30">
                        <td className="px-6 py-4 font-medium">{u.email}</td>
                        <td className="px-6 py-4">{u.fullName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.status === UserStatus.PENDING_DEV_APPROVAL ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <AppButton size="sm" variant="primary" onClick={() => openApprovalModal(u)}>
                            Approve
                          </AppButton>
                          <AppButton size="sm" variant="destructive" onClick={() => declineUser(u.uid)}>
                            Decline
                          </AppButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'PRODUCTS' ? (
          <div>
             {/* Same as before */}
             {deletedProducts.length === 0 ? (
              <div className="p-12 flex flex-col items-center text-muted-foreground">
                <Trash2 className="h-12 w-12 mb-4 opacity-20" />
                <p>No deleted products found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3 font-medium">Product Name</th>
                      <th className="px-6 py-3 font-medium">SKU</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deletedProducts.map(product => (
                      <tr key={product.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 font-medium">{product.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{product.sku}</td>
                        <td className="px-6 py-4 text-right">
                          <AppButton size="sm" variant="outline" onClick={() => handleRestoreProduct(product.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Restore
                          </AppButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'EMPLOYEES' ? (
          <div>
            {/* Same as before */}
            {deletedEmployees.length === 0 ? (
              <div className="p-12 flex flex-col items-center text-muted-foreground">
                <Trash2 className="h-12 w-12 mb-4 opacity-20" />
                <p>No deleted employees found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3 font-medium">Employee Name</th>
                      <th className="px-6 py-3 font-medium">Role</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deletedEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 font-medium flex items-center gap-3">
                          {emp.firstName} {emp.lastName}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{emp.role}</td>
                        <td className="px-6 py-4 text-right">
                          <AppButton size="sm" variant="outline" onClick={() => handleRestoreEmployee(emp.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Restore
                          </AppButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 max-w-md">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Update Supervisor Password
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <AppButton type="submit" disabled={isSavingPassword || !newPassword.trim()}>
                <Save className="h-4 w-4 mr-2" /> {isSavingPassword ? 'Saving...' : 'Save New Password'}
              </AppButton>
            </form>
          </div>
        )}
      </AppCard>

      {/* Role Selection Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-lg">Approve Worker Job</h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Select the appropriate access level for <span className="font-semibold text-foreground">{selectedUserForApproval?.email}</span>.
              </p>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="radio" name="role" checked={selectedRole === Role.STAFF} onChange={() => setSelectedRole(Role.STAFF)} className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">Staff</div>
                    <div className="text-xs text-muted-foreground">Standard access to inventory and operations.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="radio" name="role" checked={selectedRole === Role.MANAGER} onChange={() => setSelectedRole(Role.MANAGER)} className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">Manager</div>
                    <div className="text-xs text-muted-foreground">Can oversee staff and modify select configurations.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-amber-200 dark:border-amber-900/50">
                  <input type="radio" name="role" checked={selectedRole === Role.ADMIN} onChange={() => setSelectedRole(Role.ADMIN)} className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                  <div>
                    <div className="font-medium text-amber-700 dark:text-amber-500">Admin (Boss)</div>
                    <div className="text-xs text-amber-600/70 dark:text-amber-500/70">Full control. Requires Developer Escalation approval.</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="p-4 border-t bg-muted/20 flex justify-end gap-3">
              <AppButton variant="outline" onClick={() => setIsRoleModalOpen(false)}>Cancel</AppButton>
              <AppButton variant="primary" onClick={confirmApproval}>Confirm Approval</AppButton>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
