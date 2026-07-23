import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Notifications" 
        description="All your alerts, updates, and system notifications in one place."
      />
      <AppCard className="p-12 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Bell className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">You're all caught up!</h3>
        <p className="text-muted-foreground max-w-sm">
          You don't have any new notifications right now. When things happen, they will show up here.
        </p>
      </AppCard>
    </PageContainer>
  );
}
