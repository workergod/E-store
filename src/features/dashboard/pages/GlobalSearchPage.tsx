import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import { issueRepository } from '../../../repositories/IssueRepository';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft, User, Package, RefreshCw, Printer } from 'lucide-react';
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

        // Fetch issues to get their issued and returned materials and check sites
        const allIssues = await issueRepository.getAll(companyId);

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
        
        let finalResults: any[] = [];
          
        if (uniqueEmployees.length > 0) {
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

          finalResults = [...finalResults, ...enrichedResults];
        }

        // Find matching sites
        const matchedSitesMap = new Map();
        allIssues.forEach(issue => {
          if (issue.siteName && issue.siteName.toLowerCase().includes(queryLower)) {
            const site = issue.siteName.trim();
            if (!matchedSitesMap.has(site)) {
              matchedSitesMap.set(site, []);
            }
            matchedSitesMap.get(site).push(issue);
          }
        });

        const siteResults = Array.from(matchedSitesMap.entries()).map(([siteName, siteIssues]) => {
            const issuesWithItems = siteIssues.filter((i: any) => i.items.some((it: any) => it.issuedQty > 0)).map((issue: any) => {
              const e = allEmployees.find(emp => emp.id === issue.employeeId);
              return {
                id: issue.id,
                date: issue.createdAt?.toDate ? issue.createdAt.toDate() : new Date(issue.issueDate as any),
                employeeName: e ? `${e.firstName} ${e.lastName}` : 'Unknown',
                notes: issue.notes,
                items: issue.items.filter((it: any) => it.issuedQty > 0)
              };
            }).sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

            const returnsWithItems = siteIssues.filter((i: any) => i.items.some((it: any) => it.returnedQty > 0)).map((issue: any) => {
              const e = allEmployees.find(emp => emp.id === issue.employeeId);
              return {
                id: issue.id,
                date: issue.updatedAt?.toDate ? issue.updatedAt.toDate() : new Date(),
                employeeName: e ? `${e.firstName} ${e.lastName}` : 'Unknown',
                notes: issue.notes,
                items: issue.items.filter((it: any) => it.returnedQty > 0)
              };
            }).sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

            return {
              type: 'SITE',
              siteName: siteName,
              issuedMaterials: issuesWithItems,
              returnedMaterials: returnsWithItems
            };
        });

        finalResults = [...finalResults, ...siteResults];
        setResults(finalResults);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [companyId, searchQuery]);

  const handlePrintHistory = (result: any) => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      window.print();
      return;
    }

    const title = result.type === 'EMPLOYEE' 
      ? `Material History: ${result.employee.firstName} ${result.employee.lastName}`
      : `Material History: Site ${result.siteName}`;
    
    const subtitle = result.type === 'EMPLOYEE'
      ? `Role: ${result.employee.role} | Contact: ${result.employee.mobile}`
      : 'Site History Report';

    let html = `
      <html><head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
        h1 { margin: 0 0 5px 0; font-size: 24px; color: #000; }
        .subtitle { color: #666; font-size: 14px; margin: 0; }
        .transaction { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
        .transaction-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px; font-size: 13px; border-bottom: 1px dashed #eee; padding-bottom: 5px; }
        .transaction-meta { font-size: 11px; color: #666; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
        th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; }
        th { font-weight: bold; color: #555; background: #f9f9f9; }
        .qty { text-align: right; font-weight: bold; width: 100px; }
        .notes { font-style: italic; font-size: 11px; color: #666; margin-top: 5px; padding: 5px; background: #f9f9f9; }
        .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #999; }
        .section-title { margin-top: 30px; margin-bottom: 15px; font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #444; }
        .empty { font-style: italic; color: #999; margin-left: 10px; }
      </style></head><body>
      
      <div class="header">
        <h1>${title}</h1>
        <p class="subtitle">${subtitle}</p>
      </div>
    `;

    // Issued Section
    html += \`<div class="section-title">📦 Issued Materials</div>\`;
    if (result.issuedMaterials.length > 0) {
      result.issuedMaterials.forEach((issue: any) => {
        html += \`<div class="transaction">
          <div class="transaction-header">
            <span>\${issue.date.toLocaleDateString('en-IN')} \${issue.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            <span class="transaction-meta">ID: \${issue.id?.slice(-6) || 'N/A'} \${issue.siteName ? '| Site: ' + issue.siteName : ''} \${issue.employeeName ? '| Tech: ' + issue.employeeName : ''}</span>
          </div>
          <table>
            <thead><tr><th>Product Name</th><th class="qty">Qty Issued</th></tr></thead>
            <tbody>
              \${issue.items.map((mat: any) => \`<tr><td>\${mat.productName}</td><td class="qty">\${mat.issuedQty}</td></tr>\`).join('')}
            </tbody>
          </table>
          \${issue.notes ? \`<div class="notes">Note: \${issue.notes}</div>\` : ''}
        </div>\`;
      });
    } else {
      html += \`<p class="empty">No materials issued.</p>\`;
    }

    // Returned Section
    html += \`<div class="section-title" style="margin-top:40px;">🔄 Returned Materials</div>\`;
    if (result.returnedMaterials.length > 0) {
      result.returnedMaterials.forEach((issue: any) => {
        html += \`<div class="transaction">
          <div class="transaction-header">
            <span>\${issue.date.toLocaleDateString('en-IN')} \${issue.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            <span class="transaction-meta">ID: \${issue.id?.slice(-6) || 'N/A'} \${issue.siteName ? '| Site: ' + issue.siteName : ''} \${issue.employeeName ? '| Tech: ' + issue.employeeName : ''}</span>
          </div>
          <table>
            <thead><tr><th>Product Name</th><th class="qty">Qty Returned</th></tr></thead>
            <tbody>
              \${issue.items.map((mat: any) => \`<tr><td>\${mat.productName}</td><td class="qty">\${mat.returnedQty}</td></tr>\`).join('')}
            </tbody>
          </table>
        </div>\`;
      });
    } else {
      html += \`<p class="empty">No materials returned.</p>\`;
    }

    html += \`
      <div class="footer">
        Printed on \${new Date().toLocaleString('en-IN')}
      </div>
      </body></html>
    \`;

    w.document.write(html);
    w.document.close();
    
    setTimeout(() => w.print(), 250);
  };

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
            <AppCard key={idx} className="overflow-hidden print:shadow-none print:border-none">
              <div className="bg-muted/30 p-6 border-b border-border flex justify-between items-center print:bg-transparent">
                <div className="flex items-center gap-4">
                  {result.type === 'EMPLOYEE' ? (
                    <>
                      {result.employee.photoUrl ? (
                        <img src={result.employee.photoUrl} alt="Profile" className="w-12 h-12 rounded-full object-cover border border-border shadow-sm print:border print:border-border shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg print:border print:border-border shrink-0">
                          {result.employee.firstName.charAt(0)}{result.employee.lastName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold print:text-black">{result.employee.firstName} {result.employee.lastName}</h2>
                        <p className="text-sm text-muted-foreground print:text-gray-700">{result.employee.role} • {result.employee.mobile}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-lg print:border print:border-gray-300 print:text-black">
                        {result.siteName.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold print:text-black">Site: {result.siteName}</h2>
                        <p className="text-sm text-muted-foreground print:text-gray-700">Location Materials History</p>
                      </div>
                    </>
                  )}
                </div>
                <AppButton variant="outline" size="sm" onClick={() => handlePrintHistory(result)} className="print:hidden">
                  <Printer className="h-4 w-4 mr-2" /> Print History
                </AppButton>
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
                        <div key={i} className="bg-muted/10 border border-border rounded-lg overflow-hidden print:break-inside-avoid print:bg-transparent">
                          <div className="bg-muted/20 px-4 py-2 border-b border-border flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-sm block print:text-black">{issue.date.toLocaleDateString('en-IN')} {issue.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                              {issue.siteName && <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold print:text-gray-700">Site: {issue.siteName}</span>}
                              {issue.employeeName && <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold print:text-gray-700"> • Tech: {issue.employeeName}</span>}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono print:text-gray-500">ID: {issue.id?.slice(-6)}</span>
                          </div>
                          <ul className="divide-y divide-border">
                            {issue.items.map((mat: any, j: number) => (
                              <li key={j} className="flex justify-between items-center text-sm p-3 hover:bg-muted/5 transition-colors">
                                <span className="font-medium print:text-black">{mat.productName}</span>
                                <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs print:text-black print:border print:border-gray-300">Qty: {mat.issuedQty}</span>
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
                        <div key={i} className="bg-muted/10 border border-border rounded-lg overflow-hidden print:break-inside-avoid print:bg-transparent">
                          <div className="bg-muted/20 px-4 py-2 border-b border-border flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-sm block print:text-black">{issue.date.toLocaleDateString('en-IN')} {issue.date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                              {issue.siteName && <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold print:text-gray-700">Site: {issue.siteName}</span>}
                              {issue.employeeName && <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold print:text-gray-700"> • Tech: {issue.employeeName}</span>}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono print:text-gray-500">ID: {issue.id?.slice(-6)}</span>
                          </div>
                          <ul className="divide-y divide-border">
                            {issue.items.map((mat: any, j: number) => (
                              <li key={j} className="flex justify-between items-center text-sm p-3 hover:bg-muted/5 transition-colors">
                                <span className="font-medium print:text-black">{mat.productName}</span>
                                <span className="font-bold text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 px-2 py-0.5 rounded text-xs print:text-black print:border print:border-gray-300">Returned: {mat.returnedQty}</span>
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
