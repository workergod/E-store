import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Building2, Phone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from "../../../store/authStore";
import { supplierRepository } from '../../../repositories/SupplierRepository';
import type { Supplier } from '../../../shared/types/Supplier';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { SupplierFormDialog } from '../components/SupplierFormDialog';

export default function SuppliersPage() {
  const { company } = useAuthStore();
  const companyId = company?.companyId;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>(undefined);

  const loadSuppliers = useCallback(async () => {
    if (!companyId) return;
    try {
      setIsLoading(true);
      const data = await supplierRepository.getAll(companyId);
      setSuppliers(data);
    } catch (error) {
      toast.error('Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSuppliers();
  }, [loadSuppliers]);

  const handleAdd = () => {
    setSelectedSupplier(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.supplierCode && s.supplierCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
    s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage vendor contact details and financial terms.</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by Company, Code, or Contact Person..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading suppliers...</div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No suppliers found</h3>
            <p className="text-muted-foreground mt-1">Add your first supplier to start creating purchase orders.</p>
            <Button onClick={handleAdd} className="mt-6" variant="outline">Add Supplier</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">Terms</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {supplier.companyName}
                        {supplier.isPreferredSupplier && (
                          <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Preferred</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{supplier.supplierCode || 'No Code'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{supplier.contactPerson}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3"/> {supplier.phone}</span>
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3"/> {supplier.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {supplier.paymentTerms || 'Standard'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        supplier.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <SupplierFormDialog
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={loadSuppliers}
          supplier={selectedSupplier}
        />
      )}
    </div>
  );
}
