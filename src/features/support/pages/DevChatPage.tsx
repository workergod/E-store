import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { AppButton } from '../../../shared/app/AppButton';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { 
  Send, Bot, MessageCircle, RefreshCw, Trash2, 
  Reply, X, Info, User as UserIcon, CheckCheck, 
  AlertTriangle, Search, CheckCircle2, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store/authStore';
import { 
  getFirestore, doc, onSnapshot, updateDoc, 
  arrayUnion, collection, getDocs, setDoc 
} from 'firebase/firestore';
import type { ChatMessage, User } from '../../../types/User';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '../../../shared/ui/UserAvatar';
import { UserProfileModal } from '../components/UserProfileModal';

export default function DevChatPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const db = getFirestore();

  const [isOnline, setIsOnline] = useState(false);
  const [usersWithChats, setUsersWithChats] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState('');

  // Replying state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Clear chat confirm modal state
  const [clearTargetUser, setClearTargetUser] = useState<User | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Access check
  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.email !== 'developeremil@estorepro.internal' && user?.email !== 'workshop9283@gmail.com') {
      navigate('/');
      return;
    }

    // Listen to dev's own online status
    const unsubMe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setIsOnline(!!snap.data().isSupportOnline);
      }
    });

    loadCompanies();
    loadUsers();

    return () => unsubMe();
  }, [user]);

  const loadCompanies = async () => {
    try {
      const snap = await getDocs(collection(db, 'companies'));
      const map: Record<string, string> = {};
      snap.forEach(d => {
        const data = d.data();
        map[d.id] = data.companyName || 'Cryodeal';
      });
      // Fallback for default company ID
      map['company_Zu6sHXTq'] = 'Cryodeal';
      setCompanyMap(map);
    } catch (e) {
      console.error('Failed to load companies:', e);
      setCompanyMap({ company_Zu6sHXTq: 'Cryodeal' });
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const [snap, empSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'employees')).catch(() => ({ docs: [] } as any))
      ]);

      const empPhotoMap: Record<string, string> = {};
      empSnap.docs?.forEach((d: any) => {
        const emp = d.data();
        if (emp.photoUrl) {
          if (emp.username) empPhotoMap[emp.username.toLowerCase().replace('@', '')] = emp.photoUrl;
          const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase();
          if (fullName) empPhotoMap[fullName] = emp.photoUrl;
          if (emp.firstName) empPhotoMap[emp.firstName.toLowerCase()] = emp.photoUrl;
        }
      });

      const list: User[] = [];
      snap.forEach(d => {
        const data = d.data() as User;
        if (data.supportChats && data.supportChats.length > 0) {
          const userKey = (data.fullName || '').toLowerCase().trim();
          const userUname = (data.username || data.email?.split('@')[0] || '').toLowerCase().replace('@', '');
          const resolvedPhoto = data.photoURL || empPhotoMap[userKey] || empPhotoMap[userUname] || '';

          list.push({ ...data, uid: d.id, photoURL: resolvedPhoto });
        }
      });

      // Sort by latest message descending
      list.sort((a, b) => {
        const aLast = a.supportChats![a.supportChats!.length - 1]?.timestamp || 0;
        const bLast = b.supportChats![b.supportChats!.length - 1]?.timestamp || 0;
        return bLast - aLast;
      });

      setUsersWithChats(list);
      if (!selectedUserId && list.length > 0) {
        setSelectedUserId(list[0].uid);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load active chats');
    } finally {
      setIsLoading(false);
    }
  };

  // Listen to selected user in real-time
  useEffect(() => {
    if (!selectedUserId) return;
    const unsubSelected = onSnapshot(doc(db, 'users', selectedUserId), (snap) => {
      if (snap.exists()) {
        const data = { ...snap.data(), uid: snap.id } as User;
        setUsersWithChats(prev => {
          const existing = prev.find(u => u.uid === selectedUserId);
          const resolvedData = {
            ...data,
            photoURL: data.photoURL || existing?.photoURL || ''
          };
          const exists = prev.some(u => u.uid === selectedUserId);
          if (exists) {
            return prev.map(u => u.uid === selectedUserId ? resolvedData : u);
          }
          return [resolvedData, ...prev];
        });
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 80);
      }
    });
    return () => unsubSelected();
  }, [selectedUserId]);

  const toggleOnlineStatus = async () => {
    if (!user) return;
    const nextStatus = !isOnline;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isSupportOnline: nextStatus
      });
      setIsOnline(nextStatus);
      toast.success(nextStatus ? 'You are now marked Online for support' : 'You are now marked Offline');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update online status');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !selectedUserId) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.uid,
      senderName: 'Developer',
      text: inputText.trim(),
      timestamp: Date.now(),
      isBot: false,
      ...(replyingTo ? {
        replyTo: {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text
        }
      } : {})
    };

    setInputText('');
    setReplyingTo(null);

    try {
      const targetUserRef = doc(db, 'users', selectedUserId);
      await updateDoc(targetUserRef, {
        supportChats: arrayUnion(newMsg)
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    }
  };

  const handleClearChat = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        supportChats: []
      });
      toast.success('Chat history cleared successfully');
      setClearTargetUser(null);
      // Reload user list or update local state
      setUsersWithChats(prev => prev.map(u => u.uid === userId ? { ...u, supportChats: [] } : u));
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear chat');
    }
  };

  const selectedUser = usersWithChats.find(u => u.uid === selectedUserId);
  const messages = selectedUser?.supportChats || [];
  const selectedCompanyName = selectedUser?.companyId 
    ? (companyMap[selectedUser.companyId] || 'Cryodeal') 
    : 'Cryodeal';

  const filteredUsers = usersWithChats.filter(u => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <PageContainer>
      <PageHeader 
        title="Developer Chat Console" 
        description="Manage live support chats, reply to team members, and toggle your online availability."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status:</span>
            <AppButton 
              variant={isOnline ? 'default' : 'outline'} 
              className={isOnline ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-emerald-600 shadow-sm gap-2' : 'gap-2'}
              onClick={toggleOnlineStatus}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-muted-foreground'}`}></span>
              {isOnline ? 'Online' : 'Offline'}
            </AppButton>
            <AppButton variant="outline" size="icon" onClick={loadUsers} disabled={isLoading} title="Refresh active chats">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </AppButton>
          </div>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 h-[640px] max-h-[75vh]">
        {/* User List Panel (Left) */}
        <AppCard className="col-span-1 flex flex-col overflow-hidden border border-border shadow-sm p-0">
          <div className="p-3.5 border-b border-border bg-muted/20 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" /> Active Chats ({usersWithChats.length})
              </h3>
            </div>
            {/* Search filter for chats */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user or role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-background outline-none focus:border-primary shadow-2xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                No active support chats found.
              </div>
            ) : (
              filteredUsers.map(u => {
                const userMsgs = u.supportChats || [];
                const lastMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1] : null;
                const isSelected = selectedUserId === u.uid;
                const resolvedComp = u.companyId ? (companyMap[u.companyId] || 'Cryodeal') : 'Cryodeal';

                return (
                  <div 
                    key={u.uid} 
                    onClick={() => setSelectedUserId(u.uid)}
                    className={`p-3.5 cursor-pointer hover:bg-muted/40 transition-colors flex items-start gap-3 group relative ${
                      isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <UserAvatar
                      name={u.fullName}
                      email={u.email}
                      photoUrl={u.photoURL}
                      role={u.role}
                      size="md"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="font-bold text-xs truncate text-foreground">
                          {u.fullName || u.email}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-1 font-medium">
                            {new Date(lastMsg.timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                        <span className="font-semibold text-primary">{u.role || 'Staff'}</span>
                        <span>•</span>
                        <span className="truncate">{resolvedComp}</span>
                      </div>

                      {lastMsg && (
                        <p className="text-xs text-muted-foreground/90 truncate font-medium">
                          {lastMsg.senderName === 'Developer' ? 'You: ' : ''}{lastMsg.text}
                        </p>
                      )}
                    </div>

                    {/* Quick clear button on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setClearTargetUser(u);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                      title="Clear chat history"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </AppCard>

        {/* Chat Window Panel (Right) */}
        <AppCard className="col-span-1 md:col-span-2 flex flex-col overflow-hidden border border-border shadow-sm p-0">
          {!selectedUser ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <MessageCircle className="h-16 w-16 mb-4 opacity-20 text-primary" />
              <h4 className="text-base font-bold text-foreground">No Chat Selected</h4>
              <p className="text-xs mt-1 max-w-xs">Select any customer from the active chats list on the left to start viewing and replying to messages.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3.5 px-5 border-b border-border bg-muted/20 flex items-center justify-between">
                <div 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-3 cursor-pointer group select-none hover:opacity-90"
                  title="Click to view full user profile & info"
                >
                  <UserAvatar
                    name={selectedUser.fullName}
                    email={selectedUser.email}
                    photoUrl={selectedUser.photoURL}
                    role={selectedUser.role}
                    size="lg"
                    showOnlineStatus={true}
                    isOnline={true}
                    className="group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                        {selectedUser.fullName || selectedUser.email}
                        <ChevronRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      <span className="font-bold text-foreground">{selectedUser.role || 'Store Keeper'}</span>
                      <span className="mx-1.5">•</span>
                      <span className="text-primary font-bold">{selectedCompanyName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AppButton
                    variant="outline"
                    size="sm"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="h-8 text-xs font-semibold gap-1.5"
                    title="View Profile Details"
                  >
                    <Info className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden sm:inline">Profile</span>
                  </AppButton>

                  <AppButton
                    variant="outline"
                    size="sm"
                    onClick={() => setClearTargetUser(selectedUser)}
                    className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive gap-1.5"
                    title="Clear Conversation from Console"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Chat</span>
                  </AppButton>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-background">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2 opacity-60" />
                    <p className="font-semibold text-sm text-foreground">Chat is clean & cleared</p>
                    <p className="text-xs text-muted-foreground mt-1">Send a message below to reach out to {selectedUser.fullName || 'the customer'}.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                      <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg relative`}>
                        <div className={`flex gap-2.5 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <UserAvatar
                            name={msg.senderName}
                            photoUrl={!isMe && !msg.isBot ? selectedUser?.photoURL : null}
                            isDev={isMe}
                            isBot={msg.isBot}
                            size="sm"
                            className="mt-1"
                          />

                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1 px-1">
                              <span className="text-[11px] font-bold text-muted-foreground">
                                {isMe ? 'You (Developer)' : msg.senderName}
                              </span>
                              <span className="text-[10px] text-muted-foreground/70">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="relative group/bubble">
                              <div
                                className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-2xs ${
                                  isMe 
                                    ? 'bg-primary text-primary-foreground rounded-tr-xs' 
                                    : msg.isBot
                                    ? 'bg-muted/70 text-foreground rounded-tl-xs border border-border'
                                    : 'bg-muted text-foreground rounded-tl-xs'
                                }`}
                              >
                                {/* Quoted Reply preview inside message */}
                                {msg.replyTo && (
                                  <div className={`mb-2 px-2.5 py-1.5 rounded-lg text-xs border-l-3 ${
                                    isMe
                                      ? 'bg-black/15 border-primary-foreground/90 text-primary-foreground/90'
                                      : 'bg-background/80 border-primary text-foreground/85'
                                  }`}>
                                    <span className="font-bold text-[10px] block opacity-90">
                                      {msg.replyTo.senderName}
                                    </span>
                                    <span className="truncate block text-[11px] opacity-80 max-w-xs">
                                      {msg.replyTo.text}
                                    </span>
                                  </div>
                                )}

                                {msg.text}
                              </div>

                              {/* Hover reply button */}
                              <button
                                onClick={() => {
                                  setReplyingTo(msg);
                                  inputRef.current?.focus();
                                }}
                                className={`absolute top-1/2 -translate-y-1/2 p-1 rounded-full bg-background border border-border shadow-xs opacity-0 group-hover/bubble:opacity-100 transition-opacity hover:text-primary ${
                                  isMe ? '-left-8' : '-right-8'
                                }`}
                                title="Reply to this message"
                              >
                                <Reply className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Replying banner above input */}
              {replyingTo && (
                <div className="px-4 py-2 bg-primary/10 border-t border-primary/20 flex items-center justify-between text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 truncate">
                    <Reply className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-muted-foreground">Replying to <b className="text-foreground">{replyingTo.senderName}</b>:</span>
                    <span className="italic truncate max-w-sm text-foreground/80">"{replyingTo.text}"</span>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Cancel reply"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3.5 px-4 border-t border-border bg-muted/10">
                <form onSubmit={handleSend} className="flex gap-2">
                  <input 
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Reply to ${selectedUser.fullName || 'user'}...`}
                    className="flex-1 h-10 rounded-xl border border-input bg-background px-3.5 text-xs font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
                  />
                  <AppButton 
                    type="submit" 
                    disabled={!inputText.trim()}
                    className="h-10 px-4 font-bold shadow-xs"
                  >
                    <Send className="h-4 w-4 mr-1.5" /> Send
                  </AppButton>
                </form>
              </div>
            </>
          )}
        </AppCard>
      </div>

      {/* User Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          companyName={selectedCompanyName}
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onClearChat={handleClearChat}
          onFocusReply={() => inputRef.current?.focus()}
        />
      )}

      {/* Clear Chat Confirmation Dialog */}
      {clearTargetUser && (
        <AppDialog
          isOpen={true}
          onOpenChange={(open) => !open && setClearTargetUser(null)}
          title="Clear Conversation History?"
          description={`Are you sure you want to clear chat messages with ${clearTargetUser.fullName || clearTargetUser.email}?`}
          className="max-w-md"
        >
          <div className="py-3 space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              This action will permanently erase all message records with <b>{clearTargetUser.fullName || clearTargetUser.email}</b> from the Developer Console. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <AppButton variant="outline" size="sm" onClick={() => setClearTargetUser(null)}>
                Cancel
              </AppButton>
              <AppButton 
                variant="destructive" 
                size="sm" 
                onClick={() => handleClearChat(clearTargetUser.uid)}
                className="font-bold"
              >
                <Trash2 className="h-4 w-4 mr-1.5" /> Yes, Clear Chat
              </AppButton>
            </div>
          </div>
        </AppDialog>
      )}
    </PageContainer>
  );
}
