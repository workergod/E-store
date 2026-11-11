import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, X, Send, CornerDownLeft, Maximize2, 
  Bot, CheckCheck, Sparkles, User as UserIcon
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { getFirestore, doc, onSnapshot, updateDoc, arrayUnion, collection } from 'firebase/firestore';
import type { ChatMessage, User } from '../../../types/User';
import { UserAvatar } from '../../../shared/ui/UserAvatar';
import { AppButton } from '../../../shared/app/AppButton';

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may be restricted by browser policy before first user interaction
  }
}

export function LiveChatNotifier() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const db = getFirestore();

  const [notification, setNotification] = useState<{
    id: string;
    senderName: string;
    text: string;
    userId: string; // user whose thread this is
    userRole?: string;
    isDevMessage: boolean;
  } | null>(null);

  // Quick slide-out chat drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [drawerMessages, setDrawerMessages] = useState<ChatMessage[]>([]);
  const [drawerInput, setDrawerInput] = useState('');
  const [drawerTargetName, setDrawerTargetName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const drawerScrollRef = useRef<HTMLDivElement>(null);

  const sessionStartTime = useRef(Date.now());
  const lastNotifiedMsgId = useRef<string | null>(null);
  const autoDismissTimer = useRef<NodeJS.Timeout | null>(null);

  const isSuperAdmin = user?.role === 'SuperAdmin' || user?.email === 'workshop9283@gmail.com' || user?.email === 'developeremil@estorepro.internal';

  // 1. Listen for Customer (when a regular staff member receives a message from Developer)
  useEffect(() => {
    if (!user || isSuperAdmin) return;

    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as User;
      const chats = data.supportChats || [];
      if (chats.length === 0) return;

      const latest = chats[chats.length - 1];

      // Only notify if:
      // - Message arrived after the current page session began
      // - Message was not sent by the logged in user
      // - It's not a bot message (it's from the developer)
      // - User is not already on /support-chat
      // - We haven't already notified this message ID
      if (
        latest.timestamp > sessionStartTime.current &&
        latest.senderId !== user.uid &&
        !latest.isBot &&
        latest.id !== lastNotifiedMsgId.current &&
        location.pathname !== '/support-chat'
      ) {
        lastNotifiedMsgId.current = latest.id;
        playNotificationSound();

        setNotification({
          id: latest.id,
          senderName: latest.senderName || 'Developer',
          text: latest.text,
          userId: user.uid,
          userRole: 'Developer Support',
          isDevMessage: true
        });

        // Auto dismiss after 12 seconds
        if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
        autoDismissTimer.current = setTimeout(() => {
          setNotification(null);
        }, 12000);
      }
    });

    return () => unsub();
  }, [user?.uid, isSuperAdmin, location.pathname]);

  // 2. Listen for Developer (when developer receives a message from ANY customer)
  useEffect(() => {
    if (!user || !isSuperAdmin) return;

    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const userData = change.doc.data() as User;
          const chats = userData.supportChats || [];
          if (chats.length === 0) return;

          const latest = chats[chats.length - 1];

          // Check if message is from the customer (not dev, not bot)
          if (
            latest.timestamp > sessionStartTime.current &&
            latest.senderId !== user.uid &&
            !latest.isBot &&
            latest.id !== lastNotifiedMsgId.current &&
            location.pathname !== '/developer/chat'
          ) {
            lastNotifiedMsgId.current = latest.id;
            playNotificationSound();

            setNotification({
              id: latest.id,
              senderName: userData.fullName || userData.email || 'Customer',
              text: latest.text,
              userId: change.doc.id,
              userRole: userData.role || 'User',
              isDevMessage: false
            });

            if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
            autoDismissTimer.current = setTimeout(() => {
              setNotification(null);
            }, 12000);
          }
        }
      });
    });

    return () => unsub();
  }, [user?.uid, isSuperAdmin, location.pathname]);

  // 3. Sync active thread messages when Drawer is open
  useEffect(() => {
    if (!isDrawerOpen || !drawerUserId) return;

    const unsub = onSnapshot(doc(db, 'users', drawerUserId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as User;
        setDrawerMessages(data.supportChats || []);
        setTimeout(() => {
          if (drawerScrollRef.current) {
            drawerScrollRef.current.scrollTop = drawerScrollRef.current.scrollHeight;
          }
        }, 100);
      }
    });

    return () => unsub();
  }, [isDrawerOpen, drawerUserId]);

  const handleOpenDrawerFromNotification = () => {
    if (!notification) return;
    setDrawerUserId(notification.userId);
    setDrawerTargetName(notification.senderName);
    setIsDrawerOpen(true);
    setNotification(null);
  };

  const handleNavigateToFullChat = () => {
    setIsDrawerOpen(false);
    setNotification(null);
    if (isSuperAdmin) {
      navigate('/developer/chat');
    } else {
      navigate('/support-chat');
    }
  };

  const handleSendQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drawerInput.trim() || !user || !drawerUserId || isSending) return;

    try {
      setIsSending(true);
      const newMsg: ChatMessage = {
        id: Date.now().toString(),
        senderId: user.uid,
        senderName: isSuperAdmin ? 'Developer' : (user.fullName || 'User'),
        text: drawerInput.trim(),
        timestamp: Date.now(),
        isBot: false
      };

      setDrawerInput('');
      const targetRef = doc(db, 'users', drawerUserId);
      await updateDoc(targetRef, {
        supportChats: arrayUnion(newMsg)
      });
    } catch (err) {
      console.error('Failed to send quick reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Notification Box (Bottom-Right) */}
      {notification && !isDrawerOpen && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-[360px] bg-card/95 backdrop-blur-md border border-primary/30 shadow-2xl rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={notification.senderName}
                role={notification.userRole}
                isDev={notification.isDevMessage}
                size="md"
                showOnlineStatus={true}
                isOnline={true}
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-foreground leading-tight">
                    {notification.senderName}
                  </h4>
                  {notification.isDevMessage && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-primary text-primary-foreground">
                      DEV
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {notification.userRole || 'Support Message'} • Just now
                </p>
              </div>
            </div>

            <button
              onClick={() => setNotification(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/50 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-foreground font-medium line-clamp-3">
            "{notification.text}"
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary animate-pulse" /> Live Support
            </span>
            <div className="flex gap-2">
              <AppButton
                size="sm"
                variant="outline"
                onClick={() => setNotification(null)}
                className="h-7 text-xs px-2.5"
              >
                Dismiss
              </AppButton>
              <AppButton
                size="sm"
                onClick={handleOpenDrawerFromNotification}
                className="h-7 text-xs font-bold px-3 shadow-xs"
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" /> Reply Now
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Quick Chat Drawer (Bottom-Right or Side) */}
      {isDrawerOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-[380px] sm:w-[420px] h-[520px] max-h-[85vh] bg-card border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Drawer Header */}
          <div className="p-3.5 border-b border-border bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserAvatar
                name={drawerTargetName}
                isDev={!isSuperAdmin}
                size="sm"
                showOnlineStatus={true}
                isOnline={true}
              />
              <div>
                <h4 className="text-sm font-bold text-foreground leading-tight">
                  {drawerTargetName || 'Support Chat'}
                </h4>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live Chat
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleNavigateToFullChat}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Open full page chat"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Close chat drawer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Drawer Messages Body */}
          <div
            ref={drawerScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-background"
          >
            {drawerMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <MessageCircle className="h-10 w-10 mb-2 opacity-30 text-primary" />
                <p className="text-xs font-medium">No messages yet in this session.</p>
              </div>
            ) : (
              drawerMessages.map((msg, idx) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <UserAvatar
                        name={msg.senderName}
                        isDev={msg.senderName === 'Developer' || isSuperAdmin && isMe}
                        isBot={msg.isBot}
                        size="xs"
                        className="mt-1"
                      />
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-muted-foreground mb-0.5 px-1 font-medium">
                          {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div
                          className={`px-3 py-2 rounded-2xl text-xs font-medium ${
                            isMe
                              ? 'bg-primary text-primary-foreground rounded-tr-xs'
                              : msg.isBot
                              ? 'bg-muted/70 text-foreground rounded-tl-xs border border-border'
                              : 'bg-muted text-foreground rounded-tl-xs'
                          }`}
                        >
                          {msg.replyTo && (
                            <div className="mb-1.5 px-2 py-0.5 rounded text-[10px] bg-black/10 border-l-2 border-primary/50 opacity-90 truncate max-w-[200px]">
                              <b>{msg.replyTo.senderName}:</b> {msg.replyTo.text}
                            </div>
                          )}
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Input Form */}
          <form onSubmit={handleSendQuickReply} className="p-3 border-t border-border bg-muted/20 flex gap-2">
            <input
              type="text"
              value={drawerInput}
              onChange={(e) => setDrawerInput(e.target.value)}
              placeholder="Type your reply..."
              className="flex-1 h-9 rounded-xl border border-input bg-background px-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
              autoFocus
            />
            <AppButton
              type="submit"
              size="sm"
              disabled={!drawerInput.trim() || isSending}
              className="h-9 px-3 rounded-xl font-bold"
            >
              <Send className="h-3.5 w-3.5" />
            </AppButton>
          </form>
        </div>
      )}
    </>
  );
}
