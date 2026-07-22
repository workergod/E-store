import { Briefcase, FileText, UserCog, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

// This is a placeholder for future StockTransaction integration
// When Issue/Return is implemented, we will merge those transactions here.
export type TimelineEvent = 
  | { type: 'EMPLOYMENT'; title: string; date: Date; description: string }
  | { type: 'DOCUMENT'; title: string; date: Date; description: string }
  | { type: 'STATUS_CHANGE'; title: string; date: Date; description: string }
  | { type: 'ISSUE'; title: string; date: Date; description: string; quantity: number }
  | { type: 'RETURN'; title: string; date: Date; description: string; quantity: number };

interface EmployeeTimelineProps {
  events: TimelineEvent[];
}

export function EmployeeTimeline({ events }: EmployeeTimelineProps) {
  if (events.length === 0) {
    return <div className="text-center text-muted-foreground p-8">No activity recorded yet.</div>;
  }

  // Sort events newest first
  const sortedEvents = [...events].sort((a, b) => b.date.getTime() - a.date.getTime());

  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'EMPLOYMENT': return <Briefcase className="h-5 w-5 text-blue-600" />;
      case 'DOCUMENT': return <FileText className="h-5 w-5 text-purple-600" />;
      case 'STATUS_CHANGE': return <UserCog className="h-5 w-5 text-orange-600" />;
      case 'ISSUE': return <ArrowRight className="h-5 w-5 text-red-600" />;
      case 'RETURN': return <CheckCircle className="h-5 w-5 text-green-600" />;
      default: return <XCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getEventBackground = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'EMPLOYMENT': return 'bg-blue-100';
      case 'DOCUMENT': return 'bg-purple-100';
      case 'STATUS_CHANGE': return 'bg-orange-100';
      case 'ISSUE': return 'bg-red-100';
      case 'RETURN': return 'bg-green-100';
      default: return 'bg-gray-100';
    }
  };

  return (
    <div className="relative border-l-2 border-border ml-4 mt-4">
      {sortedEvents.map((evt, idx) => (
        <div key={idx} className="mb-8 ml-6 relative group">
          <span className={`absolute flex items-center justify-center w-10 h-10 rounded-full -left-11 ring-4 ring-background ${getEventBackground(evt.type)}`}>
            {getEventIcon(evt.type)}
          </span>
          <div className="bg-card border border-border p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">{evt.title}</span>
                {evt.type === 'ISSUE' && 'quantity' in evt && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    -{evt.quantity}
                  </span>
                )}
                {evt.type === 'RETURN' && 'quantity' in evt && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                    +{evt.quantity}
                  </span>
                )}
              </div>
              <time className="block mb-1 text-xs font-normal text-muted-foreground">
                {evt.date.toLocaleDateString()} {evt.date.toLocaleTimeString()}
              </time>
            </div>
            <div className="text-sm text-foreground">
              {evt.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
