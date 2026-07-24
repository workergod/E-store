import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { issueRepository } from '../../../repositories/IssueRepository';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft, User, Package, RefreshCw } from 'lucide-react';
import { AppButton } from '../../../shared/app/AppButton';

export default function GlobalSearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { company } = useAuthStore();
  const companyId = company?.companyId;

  const searchQuery = (location.state as any)?.searchQuery || '';
  
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!companyId || !searchQuery) {
      setIsLoading(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      try {
        const queryLower = searchQuery.toLowerCase().trim();
        
        // Fetch all employees and filter by name
        const allEmployees = await employeeRepository.getAll(companyId);
        const matchedEmployees = allEmployees.filter(emp => 
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(queryLower)
        );

        // Deduplicate matchedEmployees by name to avoid showing the same person twice if they were recreated
        const uniqueEmployeesMap = new Map();
        matchedEmployees.forEach(emp => {
          const name = `${emp.firstName} ${emp.lastName}`.toLowerCase().trim();
          if (!uniqueEmployeesMap.has(name)) {
            uniqueEmployeesMap.set(name, { ...emp, ids: [emp.id] });
          } else {
            uniqueEmployeesMap.get(name).ids.push(emp.id);
          }
        });
        
        const uniqueEmployees = Array.from(uniqueEmployeesMap.values());

        if (uniqueEmployees.length > 0) {
          // Fetch issues to get their issued and returned materials
          const allIssues = await issueRepository.getAll(companyId);
          
          const enrichedResults = uniqueEmployees.map(emp => {
            const empIssues = allIssues.filter(i => emp.ids.includes(i.employeeId));
            
            const issuesWithItems = empIssues.filter(i => i.items.some(it => it.issuedQty > 0)).map(issue => ({
              id: issue.id,
              date: issue.createdAt?.toDate ? issue.createdAt.toDate() : new Date(issue.issueDate as any),
              siteName: issue.siteName,
              notes: issue.notes,
              items: issue.items.filter(it => it.issuedQty > 0)
            })).sort((a, b) => b.date.getTime() - a.date.getTime());

            const returnsWithItems = empIssues.filter(i => i.items.some(it => it.returnedQty > 0)).map(issue => ({
              id: issue.id,
              date: issue.updatedAt?.toDate ? issue.updatedAt.toDate() : new Date(),
              siteName: issue.siteName,
              notes: issue.notes,
              items: issue.items.filter(it => it.returnedQty > 0)
            })).sort((a, b) => b.date.getTime() - a.date.getTime());

            return {
              type: 'EMPLOYEE',
              employee: emp,
              issuedMaterials: issuesWithItems,
              returnedMaterials: returnsWithItems
            };
          });

          setResults(enrichedResults);
        } else {
          setResults([]);
        }
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [companyId, searchQuery]);

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </AppButton>
      </div>
      <PageHeader 
        title={`Search Results for "${searchQuery}"`}
        description="Employee records and their material transactions."
      />

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Searching...</div>
      ) : results.length === 0 ? (
        <AppCard className="p-8 text-center text-muted-foreground">
          No employee found matching "{searchQuery}". 
          <br/>
          <AppButton variant="link" onClick={() => navigate('/transaction-log', { state: { filter: 'ALL', searchQuery } })}>
            Search in Transaction Log instead?
          </AppButton>
        </AppCard>
      ) : (
        <div className="space-y-8">
          {results.map((result, idx) => (
            <AppCard key={idx} className="overflow-hidden">
              <div className="bg-muted/30 p-6 border-b border-border flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {result.employee.firstName.charAt(0)}{result.employee.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{result.employee.firstName} {result.employee.lastName}</h2>
                  <p className="text-sm text-muted-foreground">{result.employee.role} • {result.employee.mobile}</p>
                </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Issued Materials */}
                <div>
                  <h3 className="font-semibold text-primary flex items-center gap-2 mb-4 border-b border-border pb-2">
                    <Package className="h-4 w-4" /> Issued Materials
                  </h3>
                  {result.issuedMaterials.length > 0 ? (
                    <div className="space-y-4">
                      {result.issuedMaterials.map((issue: any, i: number) => (
                        <div key={i} className="bg-muted/10 border border-border rounded-lg overflow-hidden">
                          <div className="bg-muted/20 px-4 py-2 border-b border-border flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-sm block">{issue.date.toLocaleDateString('en-IN')} {issue.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                              {issue.siteName && <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Site: {issue.siteName}</span>}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: {issue.id?.slice(-6)}</span>
                          </div>
                          <ul className="divide-y divide-border">
                            {issue.items.map((mat: any, j: number) => (
                              <li key={j} className="flex justify-between items-center text-sm p-3 hover:bg-muted/5 transition-colors">
                                <span className="font-medium">{mat.productName}</span>
                                <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">Qty: {mat.issuedQty}</span>
                              </li>
                            ))}
                          </ul>
                          {issue.notes && (
                            <div className="px-4 py-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs italic border-t border-amber-500/20">
                              Note: {issue.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic p-4 bg-muted/10 rounded-md text-center border border-dashed border-border">
                      Not Issued Materials
                    </div>
                  )}
                </div>

                {/* Returned Materials */}
                <div>
                  <h3 className="font-semibold text-[hsl(var(--success))] flex items-center gap-2 mb-4 border-b border-border pb-2">
                    <RefreshCw className="h-4 w-4" /> Returned Materials
                  </h3>
                  {result.returnedMaterials.length > 0 ? (
                    <div className="space-y-4">
                      {result.returnedMaterials.map((issue: any, i: number) => (
                        <div key={i} className="bg-muted/10 border border-border rounded-lg overflow-hidden">
                          <div className="bg-muted/20 px-4 py-2 border-b border-border flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-sm block">{issue.date.toLocaleDateString('en-IN')} {issue.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                              {issue.siteName && <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Site: {issue.siteName}</span>}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: {issue.id?.slice(-6)}</span>
                          </div>
                          <ul className="divide-y divide-border">
                            {issue.items.map((mat: any, j: number) => (
                              <li key={j} className="flex justify-between items-center text-sm p-3 hover:bg-muted/5 transition-colors">
                                <span className="font-medium">{mat.productName}</span>
                                <span className="font-bold text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 px-2 py-0.5 rounded text-xs">Returned: {mat.returnedQty}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic p-4 bg-muted/10 rounded-md text-center border border-dashed border-border">
                      Not Returned Materials
                    </div>
                  )}
                </div>
              </div>
            </AppCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
