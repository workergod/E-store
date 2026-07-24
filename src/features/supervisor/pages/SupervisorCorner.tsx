import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { AppButton } from '../../../shared/app/AppButton';
import { productRepository } from '../../../repositories/ProductRepository';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { settingsRepository } from '../../../repositories/SettingsRepository';
import { useAuthStore } from '../../../store/authStore';
import { ShieldAlert, RefreshCw, KeyRound, Save, Trash2, Package, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function SupervisorCorner() {
  const navigate = useNavigate();
  const { company, user } = useAuthStore();
  const companyId = company?.companyId;

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'EMPLOYEES' | 'SETTINGS'>('PRODUCTS');
  
  const [deletedProducts, setDeletedProducts] = useState<any[]>([]);
  const [deletedEmployees, setDeletedEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    // Basic security check: if they didn't log in via the modal this session, kick them out
    if (sessionStorage.getItem('supervisor_auth') !== 'true') {
      navigate('/');
      return;
    }
    
    if (companyId) {
      fetchDeletedItems();
    }
  }, [companyId, navigate]);

  const fetchDeletedItems = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const allProducts = await productRepository.getAll(companyId);
      const allEmployees = await employeeRepository.getAll(companyId);

      setDeletedProducts(allProducts.filter(p => p.status === 'DELETED'));
      setDeletedEmployees(allEmployees.filter(e => e.status === 'DELETED'));
    } catch (error) {
      console.error('Failed to fetch deleted items:', error);
      toast.error('Failed to load deleted records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreProduct = async (id: string) => {
    if (!companyId || !user?.uid) return;
    try {
      await productRepository.update(id, { status: 'ACTIVE' }, companyId, user.uid);
      toast.success('Product restored successfully');
      fetchDeletedItems();
    } catch (error) {
      toast.error('Failed to restore product');
    }
  };

  const handleRestoreEmployee = async (id: string) => {
    if (!companyId || !user?.uid) return;
    try {
      await employeeRepository.update(id, { status: 'ACTIVE' }, companyId, user.uid);
      toast.success('Employee restored successfully');
      fetchDeletedItems();
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

  return (
    <PageContainer>
      <div className="flex items-center gap-3 mb-[var(--spacing-md)] text-destructive">
        <ShieldAlert className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">Supervisor Corner</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Secure area for managing deleted records and supervisor settings.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
          <div className="p-12 text-center text-muted-foreground">Loading records...</div>
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
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                            </div>
                          )}
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
    </PageContainer>
  );
}
