import { useState, useEffect } from 'react';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { useAuthStore } from '../../../store/authStore';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { issueRepository } from '../../../repositories/IssueRepository';
import { toolTransactionRepository } from '../../../repositories/ToolTransactionRepository';
import type { IssueTransaction } from '../../../shared/types/IssueTransaction';
import type { ToolIssueTransaction } from '../../../shared/types/Tool';
import { Package, Calendar, Wrench, MapPin } from 'lucide-react';

export default function MyMaterialsPage() {
  const { user, company } = useAuthStore();
  const [issues, setIssues] = useState<IssueTransaction[]>([]);
  const [toolIssues, setToolIssues] = useState<ToolIssueTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'TOOLS'>('MATERIALS');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!company?.companyId || !user?.fullName) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const empData = await employeeRepository.getAll(company.companyId);
        
        // Find employee record matching the user's name or username
        const myEmpRecord = empData.find(e => 
          `${e.firstName} ${e.lastName}`.toLowerCase().trim() === user.fullName.toLowerCase().trim() ||
          (user.username && e.username && e.username.toLowerCase() === user.username.toLowerCase())
        );

        if (myEmpRecord && myEmpRecord.id) {
          const [allIssues, allToolIssues] = await Promise.all([
            issueRepository.getAll(company.companyId),
            toolTransactionRepository.getIssueTransactions(company.companyId)
          ]);

          // Filter issues assigned to this employee
          const myIssues = allIssues.filter(i => i.employeeId === myEmpRecord.id && i.status !== 'CLOSED');
          myIssues.sort((a, b) => {
            const dateA = a.issueDate instanceof Date ? a.issueDate.getTime() : (a.issueDate as any).toDate().getTime();
            const dateB = b.issueDate instanceof Date ? b.issueDate.getTime() : (b.issueDate as any).toDate().getTime();
            return dateB - dateA;
          });
          setIssues(myIssues);

          // Filter tools assigned to this employee
          const myTools = allToolIssues.filter(i => i.employeeId === myEmpRecord.id && i.status !== 'CLOSED');
          setToolIssues(myTools);
        } else {
          setIssues([]);
          setToolIssues([]);
        }
      } catch (error) {
        console.error('Failed to load my materials & tools:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [company?.companyId, user?.fullName, user?.username]);

  return (
    <PageContainer>
      <PageHeader 
        title="My Issued Items" 
        description="View all materials, spare parts, and tools currently assigned to you for site jobs."
      />

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('MATERIALS')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'MATERIALS'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Materials ({issues.reduce((acc, i) => acc + i.items.length, 0)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TOOLS')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'TOOLS'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>Tools & Equipment ({toolIssues.reduce((acc, i) => acc + i.items.length, 0)})</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading your items...
        </div>
      ) : activeTab === 'MATERIALS' ? (
        issues.length === 0 ? (
          <AppCard className="p-12 flex flex-col items-center justify-center text-center mt-6">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No active material issues</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              You don't have any materials or spare parts currently issued to you.
            </p>
          </AppCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {issues.map(issue => (
              <AppCard key={issue.id} className="overflow-hidden border border-border shadow-sm flex flex-col">
                <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
                  <div>
                    <div className="flex items-center text-sm font-medium text-foreground">
                      <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                      {issue.issueDate instanceof Date 
                        ? issue.issueDate.toLocaleDateString() 
                        : (issue.issueDate as any).toDate().toLocaleDateString()}
                    </div>
                    {issue.siteName && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 mr-1 text-primary" />
                        Site: <b className="text-foreground ml-1">{issue.siteName}</b>
                      </div>
                    )}
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
                          <span className="font-semibold text-foreground">
                            {item.issuedQty - item.returnedQty} {item.unit || ''} {item.returnedQty > 0 ? 'remaining' : 'issued'}
                          </span>
                          {item.returnedQty > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {item.returnedQty} {item.unit || ''} returned
                            </span>
                          )}
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
        )
      ) : (
        /* TOOLS TAB */
        toolIssues.length === 0 ? (
          <AppCard className="p-12 flex flex-col items-center justify-center text-center mt-6">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No active tool issues</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              You don't have any tools or equipment currently checked out.
            </p>
          </AppCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {toolIssues.map(tIssue => (
              <AppCard key={tIssue.id} className="overflow-hidden border border-border shadow-sm flex flex-col">
                <div className="p-4 bg-muted/20 border-b border-border flex items-center justify-between">
                  <div>
                    <div className="flex items-center text-sm font-semibold text-foreground">
                      <span className="font-mono text-primary mr-2">#{tIssue.issueNumber}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(tIssue.issueDate as any).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    {tIssue.siteName && (
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3 mr-1 text-primary" />
                        Site: <b className="text-foreground ml-1">{tIssue.siteName}</b>
                      </div>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
                    {tIssue.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-4 flex-1">
                  <ul className="space-y-3">
                    {tIssue.items.map((item, idx) => {
                      const pending = item.quantity - (item.returnedQuantity || 0);
                      return (
                        <li key={idx} className="flex justify-between items-center text-sm border-b border-border/40 pb-2 last:border-0 last:pb-0">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{item.toolName}</span>
                            <span className="text-xs text-muted-foreground font-mono">Tag: {item.toolCode}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-foreground">
                              x{pending} {item.returnedQuantity > 0 ? 'remaining' : 'issued'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Condition: {item.conditionOut}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {tIssue.notes && (
                  <div className="p-3 bg-muted/10 border-t border-border text-xs text-muted-foreground italic">
                    Note: {tIssue.notes}
                  </div>
                )}
              </AppCard>
            ))}
          </div>
        )
      )}
    </PageContainer>
  );
}
