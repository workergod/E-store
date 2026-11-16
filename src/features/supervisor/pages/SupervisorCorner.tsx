import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { AppCard } from '../../../shared/app/AppCard';
import { AppButton } from '../../../shared/app/AppButton';
import { productRepository } from '../../../repositories/ProductRepository';
import { toolRepository } from '../../../repositories/ToolRepository';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { settingsRepository } from '../../../repositories/SettingsRepository';
import { userRepository } from '../../../repositories/UserRepository';
import { loginHistoryRepository } from '../../../repositories/LoginHistoryRepository';
import { useAuthStore } from '../../../store/authStore';
import { ShieldAlert, RefreshCw, KeyRound, Save, Trash2, Package, Users, UserCheck, Shield, Activity, X, Eye, EyeOff, Wrench, Clock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Role } from '../../../constants/roles';
import { UserStatus } from '../../../types/User';

export default function SupervisorCorner() {
  const navigate = useNavigate();
  const { company, user } = useAuthStore();
  const companyId = company?.companyId;

  const isDeveloper = user?.email === 'workshop9283@gmail.com' || user?.username === '@developeremil' || user?.email === 'developeremil@estorepro.internal' || user?.role === Role.SUPER_ADMIN;
  const isExecutive = user?.role === Role.MD || user?.role === Role.OWNER || (user?.role as any) === 'MD' || (user?.role as any) === 'Owner' || user?.role === Role.SUPER_ADMIN || user?.username === '@developeremilmd' || isDeveloper;

  const isDevAccount = (u: any) =>
    u?.username === '@developeremil' ||
    u?.email === 'developeremil@estorepro.internal' ||
    u?.email === 'workshop9283@gmail.com' ||
    u?.role === Role.SUPER_ADMIN ||
    (u?.role as any) === 'SuperAdmin';

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'TOOLS' | 'EMPLOYEES' | 'SETTINGS' | 'PENDING' | 'USERS'>(
    isExecutive ? 'PENDING' : 'PRODUCTS'
  );
  
  const [deletedProducts, setDeletedProducts] = useState<any[]>([]);
  const [deletedTools, setDeletedTools] = useState<any[]>([]);
  const [deletedEmployees, setDeletedEmployees] = useState<any[]>([]);
  const [allEmployeesList, setAllEmployeesList] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [allUsersList, setAllUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMeta, setPasswordMeta] = useState<{
    hasPassword: boolean;
    updatedAt: any;
    updatedByName: string | null;
    updatedByRole: string | null;
  } | null>(null);

  // Helper to resolve who deleted an item
  const resolveDeleter = (item: any) => {
    if (item.deletedByName) {
      return {
        name: item.deletedByName,
        role: item.deletedByRole || ''
      };
    }
    const uid = item.deletedBy || item.updatedBy;
    if (!uid) return { name: 'Staff / Admin', role: '' };
    
    // Match in employees
    const emp = allEmployeesList.find(e => e.id === uid || e.userId === uid || e.email === uid);
    if (emp) {
      return {
        name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name,
        role: emp.role || emp.designation || 'Staff'
      };
    }
    // Match in users
    const u = allUsersList.find(usr => usr.uid === uid || usr.id === uid);
    if (u) {
      return {
        name: u.fullName || u.username || u.email,
        role: u.role || 'Staff'
      };
    }
    if (uid === user?.uid) {
      return {
        name: user?.fullName || user?.username || 'You',
        role: (user?.role as string) || 'Supervisor'
      };
    }
    return { name: 'Staff / Admin', role: '' };
  };

  // Helper to format timestamps
  const formatDeletedDate = (d: any): string => {
    if (!d) return '-';
    try {
      const date = d?.toDate ? d.toDate() : new Date(d);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '-';
    }
  };

  // Role Selection Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForApproval, setSelectedUserForApproval] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.STAFF);

  useEffect(() => {
    if (!isExecutive && sessionStorage.getItem('supervisor_auth') !== 'true') {
      navigate('/');
      return;
    }

    if (!isExecutive && (activeTab === 'PENDING' || activeTab === 'USERS')) {
      setActiveTab('PRODUCTS');
    }
    
    if (companyId) {
      fetchData();
    }
  }, [companyId, navigate, isDeveloper, isExecutive]);

  const fetchData = async () => {
    if (!companyId) return;
    setIsLoading(true);
    let hasAnySuccess = false;

    // 1. Fetch Products
    try {
      const allProducts = await productRepository.getAll(companyId);
      setDeletedProducts(
        allProducts
          .filter(p => p.status === 'DELETED')
          .sort((a, b) => {
            const timeA = a.deletedAt?.seconds || a.updatedAt?.seconds || 0;
            const timeB = b.deletedAt?.seconds || b.updatedAt?.seconds || 0;
            return timeB - timeA;
          })
      );
      hasAnySuccess = true;
    } catch (e) {
      console.warn('Failed to load products in supervisor corner:', e);
    }

    // 2. Fetch Tools
    try {
      const allTools = await toolRepository.getAll(companyId);
      setDeletedTools(
        allTools
          .filter(t => t.status === 'DELETED')
          .sort((a, b) => {
            const timeA = (t_item: any) => t_item.deletedAt?.seconds || t_item.updatedAt?.seconds || 0;
            return timeA(b) - timeA(a);
          })
      );
      hasAnySuccess = true;
    } catch (e) {
      console.warn('Failed to load tools in supervisor corner:', e);
    }

    // 3. Fetch Employees
    try {
      const allEmployees = await employeeRepository.getAll(companyId);
      setAllEmployeesList(allEmployees);
      setDeletedEmployees(allEmployees.filter(e => e.status === 'DELETED').sort((a, b) => (`${a.firstName} ${a.lastName}`).localeCompare(`${b.firstName} ${b.lastName}`)));
      hasAnySuccess = true;
    } catch (e) {
      console.warn('Failed to load employees in supervisor corner:', e);
    }

    // 4. Fetch Password Metadata
    try {
      const meta = await settingsRepository.getSupervisorPasswordMeta(companyId);
      setPasswordMeta(meta);
      hasAnySuccess = true;
    } catch (e) {
      console.warn('Failed to load supervisor password meta:', e);
    }

    // 3. Fetch Users (Only for executives/owners who have permission)
    if (isExecutive) {
      try {
        const allUsers = await userRepository.getUsersByCompany(companyId);
        
        // Filter out deleted users, legacy unwanted gmail test accounts, and hide dev from non-devs
        const validUsers = allUsers.filter(u => {
          if ((u.status as string) === 'DELETED' || (u.status as string) === 'Deleted') return false;
          // Filter out legacy gmail test accounts
          if (u.email && u.email.endsWith('@gmail.com') && u.email !== 'workshop9283@gmail.com') {
            return false;
          }
          // Do not show the developer user to MD or other executives
          if (!isDeveloper && isDevAccount(u)) {
            return false;
          }
          return true;
        });

        setAllUsersList([...validUsers].sort((a, b) => (a.fullName || a.username || '').localeCompare(b.fullName || b.username || '')));
        setPendingUsers(validUsers.filter(u => u.status === UserStatus.PENDING || u.status === UserStatus.PENDING_DEV_APPROVAL).sort((a, b) => (a.fullName || a.username || '').localeCompare(b.fullName || b.username || '')));
        hasAnySuccess = true;
      } catch (e) {
        console.warn('Failed to load users in supervisor corner:', e);
      }
    }

    if (!hasAnySuccess) {
      toast.error('Failed to load supervisor data');
    }
    setIsLoading(false);
  };

  const handleRestoreProduct = async (id: string) => {
    if (!companyId || !user?.uid) return;
    try {
      await productRepository.restore(id, companyId, user.uid);
      toast.success('Product restored successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to restore product');
    }
  };

  const handleRestoreTool = async (id: string) => {
    if (!companyId || !user?.uid) return;
    try {
      await toolRepository.restore(id, companyId, user.uid);
      toast.success('Tool restored successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to restore tool');
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
    if (!companyId || !newPassword.trim() || !user) return;
    
    setIsSavingPassword(true);
    try {
      const hash = await settingsRepository.hashPassword(newPassword);
      await settingsRepository.setSupervisorPasswordHash(companyId, hash, {
        userId: user.uid,
        name: user.fullName || user.username || user.email || 'Supervisor',
        role: (user.role as string) || 'Supervisor'
      });
      toast.success('Supervisor password updated successfully');
      setNewPassword('');
      const meta = await settingsRepository.getSupervisorPasswordMeta(companyId);
      setPasswordMeta(meta);
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const openApprovalModal = (pendingUser: any) => {
    if (isDevAccount(pendingUser)) {
      toast.error('Developer system account cannot be modified.');
      return;
    }
    setSelectedUserForApproval(pendingUser);
    setSelectedRole(pendingUser.role || Role.STAFF);
    setIsRoleModalOpen(true);
  };

  const confirmApproval = async () => {
    if (!selectedUserForApproval) return;
    if (isDevAccount(selectedUserForApproval)) {
      toast.error('Developer system account cannot be modified.');
      return;
    }
    
    let newStatus = UserStatus.ACTIVE;
    let isApproved = true;

    // Only escalate to Developer if an ordinary supervisor is approving an Admin
    if (selectedRole === Role.ADMIN && !isExecutive) {
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

  const handleToggleUserStatus = async (targetUser: any) => {
    if (isDevAccount(targetUser)) {
      toast.error('Developer system accounts cannot be suspended.');
      return;
    }
    if (targetUser.uid === user?.uid) {
      toast.error('You cannot suspend your own account.');
      return;
    }
    const newStatus = targetUser.status === UserStatus.ACTIVE ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
    const isApproved = newStatus === UserStatus.ACTIVE;
    try {
      await userRepository.updateUser(targetUser.uid, { status: newStatus, isApproved });
      toast.success(`User status changed to ${newStatus}`);
      fetchData();
    } catch {
      toast.error('Failed to update user status');
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

  const handleDeleteUser = async (targetUser: any) => {
    if (isDevAccount(targetUser)) {
      toast.error('Developer system accounts cannot be deleted.');
      return;
    }
    if (targetUser.uid === user?.uid) {
      toast.error('You cannot delete your own account.');
      return;
    }
    const displayName = targetUser.username || targetUser.fullName || targetUser.email;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete user "${displayName}"?\n\nThis will remove their profile and immediately revoke all access.`
    );
    if (!confirmed) return;

    try {
      await userRepository.updateUser(targetUser.uid, {
        status: 'DELETED' as any,
        isApproved: false
      });
      try {
        await userRepository.deleteUser(targetUser.uid);
      } catch {
        // Fallback: Marked as DELETED
      }
      toast.success(`User ${displayName} removed successfully.`);
      fetchData();
    } catch (error: any) {
      toast.error('Failed to delete user: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-[var(--spacing-md)] text-emerald-600 dark:text-emerald-400">
        <ShieldAlert className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">
          {user?.username === '@developeremilmd' || user?.role === Role.MD || user?.role === Role.OWNER || (user?.role as any) === 'MD' ? 'MD Executive Portal' : isDeveloper ? 'Developer Command Center' : 'Supervisor Corner'}
        </h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Executive control center for user approvals, staff management, deleted record archives, and security.
      </p>

      <div className="flex flex-wrap gap-4 mb-6">
        {isExecutive && (
          <>
            <AppButton 
              variant={activeTab === 'PENDING' ? 'primary' : 'outline'} 
              onClick={() => setActiveTab('PENDING')}
            >
              <UserCheck className="h-4 w-4 mr-2" /> Pending Approvals ({pendingUsers.length})
            </AppButton>
            <AppButton 
              variant={activeTab === 'USERS' ? 'primary' : 'outline'} 
              onClick={() => setActiveTab('USERS')}
            >
              <Users className="h-4 w-4 mr-2" /> All Users Directory ({allUsersList.length})
            </AppButton>
          </>
        )}
        <AppButton 
          variant={activeTab === 'PRODUCTS' ? 'primary' : 'outline'} 
          onClick={() => setActiveTab('PRODUCTS')}
        >
          <Package className="h-4 w-4 mr-2" /> Deleted Products ({deletedProducts.length})
        </AppButton>
        <AppButton 
          variant={activeTab === 'TOOLS' ? 'primary' : 'outline'} 
          onClick={() => setActiveTab('TOOLS')}
        >
          <Wrench className="h-4 w-4 mr-2" /> Deleted Tools ({deletedTools.length})
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
                      <th className="px-6 py-3 font-medium">Username/Email</th>
                      <th className="px-6 py-3 font-medium">Name</th>
                      <th className="px-6 py-3 font-medium">Req. Role</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendingUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-muted/30">
                        <td className="px-6 py-4 font-medium">
                          <div>{u.username}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </td>
                        <td className="px-6 py-4">{u.fullName}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold">{u.role}</div>
                        </td>
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
        ) : activeTab === 'USERS' ? (
          <div>
            {allUsersList.length === 0 ? (
              <div className="p-12 flex flex-col items-center text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-20" />
                <p>No users found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3 font-medium">Username / Email</th>
                      <th className="px-6 py-3 font-medium">Full Name</th>
                      <th className="px-6 py-3 font-medium">Role</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allUsersList.map(u => {
                      const isTargetDev = isDevAccount(u);
                      const isSelf = u.uid === user?.uid;
                      return (
                        <tr key={u.uid} className="hover:bg-muted/30">
                          <td className="px-6 py-4 font-medium">
                            <div className="flex items-center gap-1.5">
                              <span>{u.username || '-'}</span>
                              {isSelf && (
                                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">{u.fullName}</td>
                          <td className="px-6 py-4">
                            <span className="font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{u.role}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${u.status === UserStatus.ACTIVE ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            {!isTargetDev && !isSelf ? (
                              <>
                                <AppButton size="sm" variant="outline" onClick={() => openApprovalModal(u)}>
                                  Change Role
                                </AppButton>
                                <AppButton size="sm" variant={u.status === UserStatus.ACTIVE ? "destructive" : "primary"} onClick={() => handleToggleUserStatus(u)}>
                                  {u.status === UserStatus.ACTIVE ? 'Suspend' : 'Activate'}
                                </AppButton>
                                <AppButton 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => handleDeleteUser(u)}
                                  title="Delete User"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </AppButton>
                              </>
                            ) : isSelf ? (
                              <span className="text-xs text-muted-foreground italic px-2">Current Active Account</span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic px-2">Protected Developer</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'PRODUCTS' ? (
          <div>
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
                      <th className="px-6 py-3 font-medium">SKU / Code</th>
                      <th className="px-6 py-3 font-medium">Category</th>
                      <th className="px-6 py-3 font-medium">Deleted By</th>
                      <th className="px-6 py-3 font-medium">Deleted Date</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deletedProducts.map(product => {
                      const deleter = resolveDeleter(product);
                      const deletedDate = formatDeletedDate(product.deletedAt || product.updatedAt);
                      return (
                        <tr key={product.id} className="hover:bg-muted/30">
                          <td className="px-6 py-4 font-medium flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary shrink-0" />
                            <span>{product.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted border border-border">
                              {product.sku || product.barcode || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground text-xs">
                            {product.categoryId || product.category || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{deleter.name}</div>
                            {deleter.role && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium inline-block mt-0.5">
                                {deleter.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                              <span>{deletedDate}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <AppButton size="sm" variant="outline" onClick={() => handleRestoreProduct(product.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Restore
                            </AppButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'TOOLS' ? (
          <div>
            {deletedTools.length === 0 ? (
              <div className="p-12 flex flex-col items-center text-muted-foreground">
                <Wrench className="h-12 w-12 mb-4 opacity-20" />
                <p>No deleted tools found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3 font-medium">Tool Name</th>
                      <th className="px-6 py-3 font-medium">Tool Code / SKU</th>
                      <th className="px-6 py-3 font-medium">Category / Brand</th>
                      <th className="px-6 py-3 font-medium">Deleted By</th>
                      <th className="px-6 py-3 font-medium">Deleted Date</th>
                      <th className="px-6 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {deletedTools.map(tool => {
                      const deleter = resolveDeleter(tool);
                      const deletedDate = formatDeletedDate(tool.deletedAt || tool.updatedAt);
                      return (
                        <tr key={tool.id} className="hover:bg-muted/30">
                          <td className="px-6 py-4 font-medium flex items-center gap-2">
                            <Wrench className="h-4 w-4 text-primary shrink-0" />
                            <span>{tool.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted border border-border">
                              {tool.toolCode || (tool as any).sku || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground text-xs">
                            {tool.category || (tool as any).categoryId || tool.brand || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">{deleter.name}</div>
                            {deleter.role && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium inline-block mt-0.5">
                                {deleter.role}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                              <span>{deletedDate}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <AppButton size="sm" variant="outline" onClick={() => handleRestoreTool(tool.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Restore
                            </AppButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'EMPLOYEES' ? (
          <div>
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
          <div className="p-8 max-w-xl space-y-6">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" /> Supervisor Password Settings
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Manage the master security password required to unlock Supervisor Corner access.
              </p>
            </div>

            {/* Password Info & Last Changed Card */}
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Security Status</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${passwordMeta?.hasPassword ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {passwordMeta?.hasPassword ? 'Password Active & Protected' : 'Not Configured'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Last Changed Password:</span>
                  <span className="font-medium text-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDeletedDate(passwordMeta?.updatedAt) !== '-' 
                      ? formatDeletedDate(passwordMeta?.updatedAt) 
                      : (passwordMeta?.hasPassword ? 'Active (Initial Setup)' : 'Never')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">Last Changed By:</span>
                  <span className="font-medium text-foreground">
                    {passwordMeta?.updatedByName ? (
                      <>
                        {passwordMeta.updatedByName}
                        {passwordMeta.updatedByRole && (
                          <span className="ml-1 text-[11px] text-muted-foreground font-normal">
                            ({passwordMeta.updatedByRole})
                          </span>
                        )}
                      </>
                    ) : (
                      passwordMeta?.hasPassword ? 'Administrator / Supervisor' : '-'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
              <div>
                <label className="block text-sm font-medium mb-1">New Supervisor Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full h-10 pl-3 pr-10 rounded-md border border-input bg-background text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Keep this password secure. It is required to view deleted archives and manage supervisor controls.
                </p>
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
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-emerald-200 dark:border-emerald-900/50">
                  <input type="radio" name="role" checked={selectedRole === Role.MD} onChange={() => setSelectedRole(Role.MD)} className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                  <div>
                    <div className="font-medium text-emerald-700 dark:text-emerald-400">MD (Managing Director)</div>
                    <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Top executive management. Full company control.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="radio" name="role" checked={selectedRole === Role.ENGINEER} onChange={() => setSelectedRole(Role.ENGINEER)} className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">Engineer</div>
                    <div className="text-xs text-muted-foreground">Standard access to inventory and operations.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="radio" name="role" checked={selectedRole === Role.TECHNICIAN} onChange={() => setSelectedRole(Role.TECHNICIAN)} className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">Technician</div>
                    <div className="text-xs text-muted-foreground">Can only access Issue Materials.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="radio" name="role" checked={selectedRole === Role.STORE_KEEPER} onChange={() => setSelectedRole(Role.STORE_KEEPER)} className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">Store Keeper</div>
                    <div className="text-xs text-muted-foreground">Access Dashboard, Products, Issue & Return Materials.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="radio" name="role" checked={selectedRole === Role.SUPERVISOR} onChange={() => setSelectedRole(Role.SUPERVISOR)} className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">Supervisor</div>
                    <div className="text-xs text-muted-foreground">Can oversee staff, operations, and inventory.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="radio" name="role" checked={selectedRole === Role.MANAGER} onChange={() => setSelectedRole(Role.MANAGER)} className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">Manager</div>
                    <div className="text-xs text-muted-foreground">Full operational access.</div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="radio" name="role" checked={selectedRole === Role.STAFF} onChange={() => setSelectedRole(Role.STAFF)} className="w-4 h-4 text-primary" />
                  <div>
                    <div className="font-medium">Staff</div>
                    <div className="text-xs text-muted-foreground">Standard access to inventory and operations.</div>
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
