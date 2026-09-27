import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { Button } from '../../../shared/ui/Button';
import { Input } from '../../../shared/ui/Input';
import { Send, User as UserIcon, Bot, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { getFirestore, doc, onSnapshot, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import type { ChatMessage, User } from '../../../types/User';

export default function SupportChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isDeveloperOnline, setIsDeveloperOnline] = useState(false);
  const [devId, setDevId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const db = getFirestore();

  useEffect(() => {
    if (!user) return;

    // Listen to user's own document for messages
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as User;
        setMessages(data.supportChats || []);
        // Scroll to bottom
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 100);
      }
    });

    // Find developer and listen to their online status
    const findDeveloper = async () => {
      const q = query(collection(db, 'users'), where('email', '==', 'developeremil@estorepro.internal'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const dId = snap.docs[0].id;
        setDevId(dId);
        
        // Listen to dev status
        onSnapshot(doc(db, 'users', dId), (devSnap) => {
          if (devSnap.exists()) {
            const devData = devSnap.data() as User;
            setIsDeveloperOnline(!!devData.isSupportOnline);
          }
        });
      }
    };

    findDeveloper();

    return () => unsubscribeUser();
  }, [user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.uid,
      senderName: user.fullName || 'User',
      text: inputText.trim(),
      timestamp: Date.now(),
      isBot: false
    };

    setInputText('');

    // Optimistic UI update not strictly needed because onSnapshot is fast, but good for UX
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      supportChats: arrayUnion(newMsg)
    });

    // If developer is offline, send an automated bot reply immediately
    if (!isDeveloperOnline) {
      setTimeout(async () => {
        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          senderId: 'bot',
          senderName: 'Support Bot',
          text: "Hi! I'm the automated assistant. The developer is currently offline. Your message has been saved, and they will reply to you here as soon as they return. How else can I help you?",
          timestamp: Date.now(),
          isBot: true
        };
        await updateDoc(userRef, {
          supportChats: arrayUnion(botMsg)
        });
      }, 1000);
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Live Support Chat" 
        description="Chat directly with the developer to get help, ask questions, or learn about features."
      />
      
      <AppCard className="flex flex-col h-[600px] max-h-[70vh] border border-border shadow-sm overflow-hidden mt-6">
        {/* Chat Header */}
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Developer Support</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${isDeveloperOnline ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground'}`}></span>
                <span className="text-xs text-muted-foreground">
                  {isDeveloperOnline ? 'Developer is Online' : 'Developer is Offline - Bot Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-background"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mb-4 opacity-20" />
              <p>No messages yet. Send a message to start chatting!</p>
              <p className="text-xs mt-2 max-w-sm text-center">
                Ask about features, request help, or report bugs. The developer will respond here.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === user?.uid;
              return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className="shrink-0 mt-1">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs
                        ${isMe ? 'bg-primary text-primary-foreground' : msg.isBot ? 'bg-secondary text-secondary-foreground' : 'bg-[hsl(var(--success))] text-white'}`}
                      >
                        {isMe ? <UserIcon className="h-4 w-4" /> : msg.isBot ? <Bot className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
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
            })
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-border bg-muted/10">
          <form onSubmit={handleSend} className="flex gap-2">
            <Input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1"
            />
            <Button type="submit" disabled={!inputText.trim()}>
              <Send className="h-4 w-4 mr-2" /> Send
            </Button>
          </form>
        </div>
      </AppCard>
    </PageContainer>
  );
}
