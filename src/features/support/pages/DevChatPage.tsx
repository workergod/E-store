import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Send, User as UserIcon, Bot, MessageCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { getFirestore, doc, onSnapshot, updateDoc, arrayUnion, collection, getDocs, query, where } from 'firebase/firestore';
import type { ChatMessage, User } from '../../../types/User';
import { useNavigate } from 'react-router-dom';

export default function DevChatPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const db = getFirestore();

  const [isOnline, setIsOnline] = useState(false);
  const [usersWithChats, setUsersWithChats] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.email !== 'developeremil@estorepro.internal') {
      navigate('/');
      return;
    }

    // Listen to dev's own online status
    const unsubMe = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setIsOnline(!!snap.data().isSupportOnline);
      }
    });

    loadUsers();

    return () => unsubMe();
  }, [user]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: User[] = [];
      snap.forEach(d => {
        const data = d.data() as User;
        if (data.supportChats && data.supportChats.length > 0) {
          list.push(data);
        }
      });
      // Sort by latest message
      list.sort((a, b) => {
        const aLast = a.supportChats![a.supportChats!.length - 1].timestamp;
        const bLast = b.supportChats![b.supportChats!.length - 1].timestamp;
        return bLast - aLast;
      });
      setUsersWithChats(list);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  // Listen to selected user
  useEffect(() => {
    if (!selectedUserId) return;
    const unsubSelected = onSnapshot(doc(db, 'users', selectedUserId), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as User;
        setUsersWithChats(prev => prev.map(u => u.uid === selectedUserId ? data : u));
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);
      }
    });
    return () => unsubSelected();
  }, [selectedUserId]);

  const toggleOnlineStatus = async () => {
    if (!user) return;
    await updateDoc(doc(db, 'users', user.uid), {
      isSupportOnline: !isOnline
    });
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
      isBot: false
    };

    setInputText('');

    const targetUserRef = doc(db, 'users', selectedUserId);
    await updateDoc(targetUserRef, {
      supportChats: arrayUnion(newMsg)
    });
  };

  const selectedUser = usersWithChats.find(u => u.uid === selectedUserId);
  const messages = selectedUser?.supportChats || [];

  return (
    <PageContainer>
      <PageHeader 
        title="Developer Chat Console" 
        description="Manage live support chats and toggle your online status."
        actions={
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Status:</span>
            <Button 
              variant={isOnline ? 'default' : 'outline'} 
              className={isOnline ? 'bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90' : ''}
              onClick={toggleOnlineStatus}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Button>
            <Button variant="outline" size="icon" onClick={loadUsers} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 h-[600px] max-h-[70vh]">
        {/* User List */}
        <AppCard className="col-span-1 overflow-y-auto border border-border shadow-sm">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="font-semibold">Active Chats</h3>
          </div>
          <div className="divide-y divide-border">
            {usersWithChats.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No chats found.</div>
            ) : (
              usersWithChats.map(u => {
                const lastMsg = u.supportChats![u.supportChats!.length - 1];
                return (
                  <div 
                    key={u.uid} 
                    onClick={() => setSelectedUserId(u.uid)}
                    className={`p-4 cursor-pointer hover:bg-muted/30 transition-colors ${selectedUserId === u.uid ? 'bg-muted/50 border-l-4 border-l-primary' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm truncate">{u.fullName || u.email}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(lastMsg.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{lastMsg.text}</p>
                  </div>
                )
              })
            )}
          </div>
        </AppCard>

        {/* Chat Window */}
        <AppCard className="col-span-1 md:col-span-2 flex flex-col overflow-hidden border border-border shadow-sm">
          {!selectedUser ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-4 opacity-20" />
              <p>Select a user to view their chat.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedUser.fullName || selectedUser.email}</h3>
                  <p className="text-xs text-muted-foreground">{selectedUser.role} • {selectedUser.companyId}</p>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === user?.uid;
                  return (
                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="shrink-0 mt-1">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs
                            ${isMe ? 'bg-primary text-primary-foreground' : msg.isBot ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-foreground'}`}
                          >
                            {isMe ? <UserIcon className="h-4 w-4" /> : msg.isBot ? <Bot className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                          </div>
                        </div>
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <span className="text-xs text-muted-foreground mb-1 px-1">
                            {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className={`px-4 py-2 rounded-2xl text-sm ${
                            isMe 
                              ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                              : 'bg-muted text-foreground rounded-tl-sm'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-border bg-muted/10">
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Reply to user..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!inputText.trim()}>
                    <Send className="h-4 w-4 mr-2" /> Send
                  </Button>
                </form>
              </div>
            </>
          )}
        </AppCard>
      </div>
    </PageContainer>
  );
}
