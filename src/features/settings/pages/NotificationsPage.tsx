import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useNotificationStore } from '../../../store/notificationStore';
import { Button } from '../../../shared/ui/Button';

export default function NotificationsPage() {
  const { notifications, markAllRead, markAsRead } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <PageContainer>
      <PageHeader 
        title="Notifications" 
        description="All your alerts, updates, and system notifications in one place."
        actions={
          unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead}>
              Mark all as read
            </Button>
          )
        }
      />
      
      {notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map(notif => (
            <AppCard 
              key={notif.id} 
              className={`p-4 flex gap-4 items-start cursor-pointer transition-colors hover:bg-muted/30 ${notif.isRead ? 'opacity-70' : 'border-l-4 border-l-primary'}`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className={`mt-1 p-2 rounded-full ${notif.isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                {notif.isRead ? <CheckCircle2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{notif.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                <span className="text-xs text-muted-foreground mt-2 block">{notif.time}</span>
              </div>
            </AppCard>
          ))}
        </div>
      ) : (
        <AppCard className="p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">You're all caught up!</h3>
          <p className="text-muted-foreground max-w-sm">
            You don't have any new notifications right now. When things happen, they will show up here.
          </p>
        </AppCard>
      )}
    </PageContainer>
  );
}
