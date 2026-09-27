import { useState, useEffect } from 'react';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { useAuthStore } from '../../../store/authStore';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { issueRepository } from '../../../repositories/IssueRepository';
import type { IssueTransaction } from '../../../shared/types/IssueTransaction';
import { Package, Calendar } from 'lucide-react';

export default function MyMaterialsPage() {
  const { user, company } = useAuthStore();
  const [issues, setIssues] = useState<IssueTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!company?.companyId || !user?.fullName) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const empData = await employeeRepository.getAll(company.companyId);
        
        // Find employee record matching the user's name
        const myEmpRecord = empData.find(e => 
          `${e.firstName} ${e.lastName}`.toLowerCase().trim() === user.fullName.toLowerCase().trim()
        );

        if (myEmpRecord && myEmpRecord.id) {
          const allIssues = await issueRepository.getAll(company.companyId);
          // Filter issues assigned to this employee
          const myIssues = allIssues.filter(i => i.employeeId === myEmpRecord.id && i.status !== 'CLOSED');
          
          // Sort by issueDate descending
          myIssues.sort((a, b) => {
            const dateA = a.issueDate instanceof Date ? a.issueDate.getTime() : (a.issueDate as any).toDate().getTime();
            const dateB = b.issueDate instanceof Date ? b.issueDate.getTime() : (b.issueDate as any).toDate().getTime();
            return dateB - dateA;
          });
          
          setIssues(myIssues);
        } else {
          setIssues([]);
        }
      } catch (error) {
        console.error('Failed to load my materials:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [company?.companyId, user?.fullName]);

  return (
    <PageContainer>
      <PageHeader 
        title="My Issued Materials" 
        description="View all tools and materials currently issued to you."
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading your materials...
        </div>
      ) : issues.length === 0 ? (
        <AppCard className="p-12 flex flex-col items-center justify-center text-center mt-6">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No active issues</h3>
          <p className="text-muted-foreground max-w-sm">
            You don't have any tools or materials currently issued to you.
          </p>
        </AppCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {issues.map(issue => (
            <AppCard key={issue.id} className="overflow-hidden border border-border shadow-sm flex flex-col">
              <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
                <div className="flex items-center text-sm font-medium text-foreground">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  {issue.issueDate instanceof Date 
                    ? issue.issueDate.toLocaleDateString() 
                    : (issue.issueDate as any).toDate().toLocaleDateString()}
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
                  {issue.status.replace('_', ' ')}
                </span>
              </div>
              <div className="p-4 flex-1">
                <ul className="space-y-3">
                  {issue.items.map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{item.productName}</span>
                        <span className="text-xs text-muted-foreground">SKU: {item.sku}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-foreground">{item.issuedQty - item.returnedQty} {item.returnedQty > 0 ? 'remaining' : 'issued'}</span>
                        {item.returnedQty > 0 && <span className="text-[10px] text-muted-foreground">{item.returnedQty} returned</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {issue.notes && (
                <div className="p-3 bg-muted/10 border-t border-border text-xs text-muted-foreground italic">
                  Note: {issue.notes}
                </div>
              )}
            </AppCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
