import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Briefcase, Calendar, Shield, Info } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from "../../../store/authStore";
import { employeeRepository } from '../../../repositories/EmployeeRepository';
import type { Employee } from '../../../shared/types/Employee';
import { AppButton } from '../../../shared/app/AppButton';
import { AppCard } from '../../../shared/app/AppCard';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { StatusBadge } from '../../../shared/feedback/StatusBadge';

import { DocumentUploader } from '../../../shared/documents/DocumentUploader';
import { EmployeeTimeline } from '../components/EmployeeTimeline';
import type { TimelineEvent } from '../components/EmployeeTimeline';
import { issueRepository } from '../../../repositories/IssueRepository';

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { company } = useAuthStore();
  const companyId = company?.companyId;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState({ issued: 0, returned: 0 });

  useEffect(() => {
    async function loadData() {
      if (!companyId || !id) return;
      try {
        setIsLoading(true);
        const emp = await employeeRepository.getById(id, companyId);
        if (!emp) {
          toast.error("Employee not found");
          navigate('/employees');
          return;
        }
        setEmployee(emp);

        // Construct mock timeline (until Phase 8)
        const timeline: TimelineEvent[] = [];
        if (emp.joiningDate) {
          timeline.push({
            type: 'EMPLOYMENT',
            title: 'Joined Company',
            date: typeof (emp.joiningDate as any).toDate === 'function' ? (emp.joiningDate as any).toDate() : new Date(emp.joiningDate as any),
            description: `Started as ${emp.designation || emp.role} in ${emp.department || 'General'}`
          });
        }

        const allIssues = await issueRepository.getAll(companyId);
        const empIssues = allIssues.filter(i => i.employeeId === id);
        
        let totalIssued = 0;
        let totalReturned = 0;

        empIssues.forEach(issue => {
          let issueCount = 0;
          let returnCount = 0;
          
          issue.items.forEach(item => {
            totalIssued += item.issuedQty;
            totalReturned += item.returnedQty;
            issueCount += item.issuedQty;
            returnCount += item.returnedQty;
          });

          if (issueCount > 0) {
            const date = issue.createdAt?.toDate ? issue.createdAt.toDate() : (issue.issueDate ? new Date(issue.issueDate) : new Date());
            timeline.push({
              type: 'UPDATE', // Use a standard type since ISSUE might not exist in TimelineEvent type enum
              title: 'Material Issued',
              date: date,
              description: `Issued ${issueCount} items. ${issue.notes ? '(' + issue.notes + ')' : ''}`
            });
          }
        });

        timeline.sort((a, b) => b.date.getTime() - a.date.getTime());
        setEvents(timeline);
        setStats({ issued: totalIssued, returned: totalReturned });
      } catch (error) {
        toast.error("Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [id, companyId, navigate]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  if (!employee) return null;

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/employees')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </AppButton>
      </div>

      {/* Header Profile Card */}
      <AppCard className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6 mb-6">
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-background shadow-sm shrink-0" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center text-4xl font-bold border-4 border-background shadow-sm shrink-0">
            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{employee.firstName} {employee.lastName}</h1>
              <p className="text-lg text-muted-foreground mt-1 flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> {employee.designation || employee.role} • {employee.department || 'General'}
              </p>
              <div className="mt-2 flex gap-3 items-center text-sm">
                <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md font-medium border border-border">
                  ID: {employee.employeeCode}
                </span>
                <StatusBadge status={employee.status} />
              </div>
            </div>
            <AppButton onClick={() => navigate(`/employees/edit/${employee.id}`)} variant="outline">
              <Edit className="h-4 w-4 mr-2" /> Edit Profile
            </AppButton>
          </div>
        </div>
      </AppCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Documents */}
        <div className="md:col-span-1 space-y-6">
          <AppCard className="p-6">
            <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2">Contact Info</h3>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3 text-muted-foreground">
                <Phone className="h-4 w-4 mt-0.5 text-foreground" />
                <div>
                  <p className="font-medium text-foreground">{employee.mobile}</p>
                  {employee.whatsapp && <p className="text-xs text-[hsl(var(--success))] font-medium">WhatsApp: {employee.whatsapp}</p>}
                </div>
              </div>
              <div className="flex items-start gap-3 text-muted-foreground">
                <Mail className="h-4 w-4 mt-0.5 text-foreground" />
                <p className="font-medium text-foreground">{employee.email || '-'}</p>
              </div>
              <div className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 text-foreground" />
                <p className="font-medium text-foreground">{employee.address || '-'}</p>
              </div>
              {employee.emergencyContact && (
                <div className="flex items-start gap-3 text-[hsl(var(--destructive))] pt-2 border-t border-border">
                  <Shield className="h-4 w-4 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold">Emergency Contact</p>
                    <p className="font-medium text-foreground">{employee.emergencyContact}</p>
                  </div>
                </div>
              )}
            </div>
          </AppCard>

          <AppCard className="p-6">
            <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
              <h3 className="text-lg font-semibold">Identity Documents</h3>
            </div>
            <DocumentUploader 
              entityType="Employee" 
              entityId={employee.id!} 
              category="IDENTITY" 
              onUploadComplete={() => {
                // Could refresh timeline if we wanted to show "Document Uploaded" event dynamically
              }}
            />
          </AppCard>
        </div>

        {/* Right Column: Stats & Timeline */}
        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
             <AppCard className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Products Issued</p>
                <p className="text-2xl font-bold text-primary">{stats.issued}</p>
             </AppCard>
             <AppCard className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Items Returned</p>
                <p className="text-2xl font-bold text-[hsl(var(--success))]">{stats.returned}</p>
             </AppCard>
             <AppCard className="p-4 text-center">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Damaged/Lost</p>
                <p className="text-2xl font-bold text-[hsl(var(--destructive))]">0</p>
             </AppCard>
          </div>

          <AppCard className="p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Activity Timeline</h3>
            </div>
            
            <EmployeeTimeline events={events} />
          </AppCard>
        </div>
      </div>
    </PageContainer>
  );
}
