import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, UserMinus, PackageOpen, Eye, Plus, Trash2, Printer, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from "../../../store/authStore";
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import type { Employee } from '../../../shared/types/Employee';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { FilterBar } from '../../../shared/layouts/FilterBar';
import { AppTable } from '../../../shared/tables/AppTable';
import { AppButton } from '../../../shared/app/AppButton';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';
import { AppCard } from '../../../shared/app/AppCard';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { company, user } = useAuthStore();
  const companyId = company?.companyId;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      if (!companyId) return;
      try {
        setIsLoading(true);
        const data = await employeeRepository.getAll(companyId);
        setEmployees(data);
      } catch (error) {
        console.error("Failed to load employees", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEmployees();
  }, [companyId]);

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
  const inactiveEmployees = employees.filter(e => e.status !== 'ACTIVE');

  const handleDelete = async (id: string) => {
    if (!companyId || !user) return;
    if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      try {
        await employeeRepository.delete(id, companyId, user.uid);
        setEmployees(employees.filter(e => e.id !== id));
      } catch (error) {
        console.error('Failed to delete employee', error);
        alert('Failed to delete employee');
      }
    }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { window.print(); return; }
    w.document.write(`
      <html><head><title>Employees Report</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        h2 { text-align: center; margin-bottom: 4px; }
        p.sub { text-align: center; color: #666; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 11px; border: 1px solid #ddd; }
        td { padding: 7px 8px; border: 1px solid #e5e7eb; font-size: 11px; vertical-align: top; }
      </style></head><body>
      ${content}
      <p style="text-align:center;margin-top:20px;font-size:10px;color:#999;">
        Printed on ${new Date().toLocaleString('en-IN')} • ${company?.companyName || 'E Store Pro'}
      </p>
      </body></html>
    `);
    w.document.close();
    w.print();
  };

  const handleExport = () => {
    if (employees.length === 0) {
      toast.error('No employees to export');
      return;
    }

    const headers = ['Employee Code', 'First Name', 'Last Name', 'Role', 'Department', 'Mobile', 'Email', 'Status'];
    const csvContent = [
      headers.join(','),
      ...employees.map(e => 
        [
          `"${(e.employeeCode || '').replace(/"/g, '""')}"`,
          `"${(e.firstName || '').replace(/"/g, '""')}"`,
          `"${(e.lastName || '').replace(/"/g, '""')}"`,
          `"${(e.role || '').replace(/"/g, '""')}"`,
          `"${(e.department || '').replace(/"/g, '""')}"`,
          `"${(e.mobile || '').replace(/"/g, '""')}"`,
          `"${(e.email || '').replace(/"/g, '""')}"`,
          e.status
        ].join(',')
      )
    ].join('\\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: 'Employee',
      accessorKey: 'firstName',
      cell: ({ row }: any) => {
        const emp = row.original;
        return (
          <div className="flex items-center gap-3">
            {emp.photoUrl ? (
              <img src={emp.photoUrl} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-border shadow-sm shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-medium text-foreground">{emp.firstName} {emp.lastName}</div>
              <div className="text-xs text-muted-foreground">{emp.employeeCode}</div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Role & Dept',
      accessorKey: 'role',
      cell: ({ row }: any) => {
        const emp = row.original;
        return (
          <div>
            <div className="font-medium">{emp.role}</div>
            <div className="text-xs text-muted-foreground">{emp.department || '-'}</div>
          </div>
        );
      }
    },
    {
      header: 'Contact',
      accessorKey: 'mobile',
      cell: ({ row }: any) => {
        const emp = row.original;
        return (
          <div>
            <div>{emp.mobile}</div>
            <div className="text-xs text-muted-foreground">{emp.email || '-'}</div>
          </div>
        );
      }
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <div className="flex justify-center">
          <StatusBadge status={row.original.status} />
        </div>
      )
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: ({ row }: any) => (
        <div className="flex justify-end gap-2">
          <AppButton variant="ghost" size="icon" onClick={() => navigate(`/employees/${row.original.id}`)}>
            <Eye className="h-4 w-4" />
          </AppButton>
          <AppButton variant="ghost" size="icon" onClick={() => handleDelete(row.original.id!)} className="text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" />
          </AppButton>
        </div>
      )
    }
  ];

  return (
    <PageContainer>
      <PageHeader 
        title="Employee Management" 
        description="Manage technicians, staff, roles, and issue history."
        actions={
          <AppButton onClick={() => navigate('/employees/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </AppButton>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AppCard className="p-6">
          <div className="flex items-center gap-3 text-primary mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-medium">Total Staff</h3>
          </div>
          <p className="text-3xl font-bold">{employees.length}</p>
        </AppCard>
        
        <AppCard className="p-6">
          <div className="flex items-center gap-3 text-[hsl(var(--success))] mb-2">
            <div className="p-2 bg-[hsl(var(--success))]/10 rounded-lg">
              <UserCheck className="h-5 w-5" />
            </div>
            <h3 className="font-medium">Active</h3>
          </div>
          <p className="text-3xl font-bold">{activeEmployees.length}</p>
        </AppCard>

        <AppCard className="p-6">
          <div className="flex items-center gap-3 text-[hsl(var(--destructive))] mb-2">
            <div className="p-2 bg-[hsl(var(--destructive))]/10 rounded-lg">
              <UserMinus className="h-5 w-5" />
            </div>
            <h3 className="font-medium">Inactive/Leave</h3>
          </div>
          <p className="text-3xl font-bold">{inactiveEmployees.length}</p>
        </AppCard>

        <AppCard className="p-6">
          <div className="flex items-center gap-3 text-[hsl(var(--warning))] mb-2">
            <div className="p-2 bg-[hsl(var(--warning))]/10 rounded-lg">
              <PackageOpen className="h-5 w-5" />
            </div>
            <h3 className="font-medium">Pending Returns</h3>
          </div>
          <p className="text-3xl font-bold">0</p>
        </AppCard>
      </div>

      <FilterBar>
        <div className="flex items-center gap-3 ml-auto">
          <AppButton variant="outline" size="sm" onClick={handleExport}><Archive className="h-4 w-4 mr-2"/> Export</AppButton>
          <AppButton variant="outline" size="sm" onClick={handlePrint}><Printer className="h-4 w-4 mr-2"/> Print</AppButton>
        </div>
      </FilterBar>

      {/* Hidden Print Layout */}
      <div ref={printRef} className="hidden">
        <h2>Employee List Report</h2>
        <p className="sub">
          Total Employees: {employees.length}
        </p>
        <table>
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Code</th>
              <th>Role / Dept</th>
              <th>Contact Info</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => (
              <tr key={e.id}>
                <td>
                  <strong>{e.firstName} {e.lastName}</strong>
                </td>
                <td>{e.employeeCode || '-'}</td>
                <td>
                  {e.role}<br/>
                  <span style={{color: '#666', fontSize: '10px'}}>{e.department || '-'}</span>
                </td>
                <td>
                  {e.mobile}<br/>
                  <span style={{color: '#666', fontSize: '10px'}}>{e.email || '-'}</span>
                </td>
                <td>{e.status}</td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr><td colSpan={5} style={{textAlign: 'center', padding: '15px'}}>No employees found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AppTable
        data={employees}
        columns={columns}
        isLoading={isLoading}
        searchKey="search"
        searchPlaceholder="Search by Name, ID, Role..."
        emptyTitle="No employees found"
        emptyDescription="Add a new employee to get started."
      />
    </PageContainer>
  );
}
