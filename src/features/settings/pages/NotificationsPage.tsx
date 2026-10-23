import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { Bell, CheckCircle2, Trash2, X } from 'lucide-react';
import { useNotificationStore } from '../../../store/notificationStore';
import { Button } from '../../../shared/ui/Button';

export default function NotificationsPage() {
  const { notifications, markAllRead, markAsRead, clearAll, removeNotification } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <PageContainer>
      <PageHeader 
        title="Notifications" 
        description="All your alerts, updates, and system notifications in one place."
        actions={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllRead}>
                Mark all as read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="outline" onClick={clearAll} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        }
      />
      
      {notifications.length > 0 ? (
        <div className="space-y-4">
          {notifications.map(notif => (
            <AppCard 
              key={notif.id} 
              className={`p-4 flex gap-4 items-start cursor-pointer transition-colors hover:bg-muted/30 group relative ${notif.isRead ? 'opacity-70' : notif.type === 'WARNING' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-primary'}`}
              onClick={() => markAsRead(notif.id)}
            >
              <div className={`mt-1 p-2 rounded-full ${notif.isRead ? 'bg-muted text-muted-foreground' : notif.type === 'WARNING' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary'}`}>
                {notif.isRead ? <CheckCircle2 className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              </div>
              <div className="flex-1 pr-8">
                <h4 className="font-semibold">{notif.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                <span className="text-xs text-muted-foreground mt-2 block">{notif.time}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNotification(notif.id);
                }}
                className="absolute top-4 right-4 text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
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
