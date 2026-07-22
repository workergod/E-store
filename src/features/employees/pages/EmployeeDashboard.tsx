import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, UserMinus, PackageOpen, Eye, Plus } from 'lucide-react';
import { useAuthStore } from "../../../store/authStore";
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import type { Employee } from '../../../shared/types/Employee';

import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppTable } from '../../../shared/tables/AppTable';
import { AppButton } from '../../../shared/app/AppButton';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';
import { AppCard } from '../../../shared/app/AppCard';

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { company } = useAuthStore();
  const companyId = company?.companyId;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const columns = [
    {
      header: 'Employee',
      accessorKey: 'firstName',
      cell: ({ row }: any) => {
        const emp = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
              {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
            </div>
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
