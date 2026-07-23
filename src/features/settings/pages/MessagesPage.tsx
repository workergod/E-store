import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Messages" 
        description="Communicate with your team members and suppliers directly."
      />
      <AppCard className="p-12 flex flex-col items-center justify-center text-center">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
        <p className="text-muted-foreground max-w-sm">
          When team members or customers message you, they'll appear here.
        </p>
      </AppCard>
    </PageContainer>
  );
}
