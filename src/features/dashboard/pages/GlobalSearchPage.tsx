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

        if (matchedEmployees.length > 0) {
          // Fetch issues to get their issued and returned materials
          const allIssues = await issueRepository.getAll(companyId);
          
          const enrichedResults = matchedEmployees.map(emp => {
            const empIssues = allIssues.filter(i => i.employeeId === emp.id);
            
            const issuedMaterials: any[] = [];
            const returnedMaterials: any[] = [];

            empIssues.forEach(issue => {
              issue.items.forEach(item => {
                if (item.issuedQty > 0) {
                  issuedMaterials.push({
                    name: item.productName,
                    qty: item.issuedQty,
                    date: issue.createdAt?.toDate ? issue.createdAt.toDate() : new Date(issue.issueDate as any)
                  });
                }
                if (item.returnedQty > 0) {
                  returnedMaterials.push({
                    name: item.productName,
                    qty: item.returnedQty,
                    date: issue.updatedAt?.toDate ? issue.updatedAt.toDate() : new Date()
                  });
                }
              });
            });

            return {
              type: 'EMPLOYEE',
              employee: emp,
              issuedMaterials,
              returnedMaterials
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
                    <ul className="space-y-3">
                      {result.issuedMaterials.map((mat: any, i: number) => (
                        <li key={i} className="flex justify-between items-center text-sm bg-muted/20 p-2 rounded-md">
                          <span className="font-medium">{mat.name}</span>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-primary">Qty: {mat.qty}</span>
                            <span className="text-[10px] text-muted-foreground">{mat.date.toLocaleDateString()}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground italic p-4 bg-muted/10 rounded-md text-center">
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
                    <ul className="space-y-3">
                      {result.returnedMaterials.map((mat: any, i: number) => (
                        <li key={i} className="flex justify-between items-center text-sm bg-muted/20 p-2 rounded-md">
                          <span className="font-medium">{mat.name}</span>
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-[hsl(var(--success))]">Qty: {mat.qty}</span>
                            <span className="text-[10px] text-muted-foreground">{mat.date.toLocaleDateString()}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-muted-foreground italic p-4 bg-muted/10 rounded-md text-center">
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
