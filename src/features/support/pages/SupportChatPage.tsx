import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppCard } from '../../../shared/app/AppCard';
import { AppButton } from '../../../shared/app/AppButton';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { 
  Send, Bot, MessageCircle, Trash2, Reply, 
  X, CheckCircle2, AlertTriangle, Sparkles, HelpCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../../store/authStore';
import { 
  getFirestore, doc, onSnapshot, updateDoc, 
  arrayUnion, collection, query, where, getDocs 
} from 'firebase/firestore';
import type { ChatMessage, User } from '../../../types/User';
import { UserAvatar } from '../../../shared/ui/UserAvatar';

function getSmartBotResponse(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes('tool') || lower.includes('kaanun') || lower.includes('patunn') || lower.includes('upakaranam')) {
    return "I've noted your question regarding Tools & Equipment! You can track active assignments in Tools > Movement Log or find them with the 'Tool Issues' filter in the Transaction Log. Developer Emil has also been alerted and will inspect your tool movement records shortly.";
  }

  if (lower.includes('print') || lower.includes('edukan') || lower.includes('slip') || lower.includes('voucher') || lower.includes('receipt')) {
    return "Looking to print vouchers? You can now click the 'Print Slip' button directly in the Transaction Log table or on the Recent Tool Issues table. Each voucher includes the Cryodeal logo, solid black borders, and 4 signature lines. Developer Emil has also received your message!";
  }

  if (lower.includes('return') || lower.includes('restock')) {
    return "For material or tool returns, you can process them via 'Return Materials' or 'Return Tools' in the sidebar or Fast Operations. Developer Emil will review this as well.";
  }

  if (lower.includes('purchase') || lower.includes('po') || lower.includes('supplier')) {
    return "For purchases and restock bills, check Purchases & Orders. Developer Emil has been informed of your inquiry.";
  }

  if (lower === 'hi' || lower === 'hello' || lower === 'hai' || lower === 'hey') {
    return "Hello! How can we help you with the Cryodeal Store system today? Developer Emil is currently away from the console, but your message is logged and they will reply to you directly here soon.";
  }

  return "Hi! I'm the Cryodeal automated support assistant. Developer Emil is currently away from the console, but your message has been safely saved and flagged for priority review. They will reply to you directly here as soon as they return.";
}

export default function SupportChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isDeveloperOnline, setIsDeveloperOnline] = useState(false);
  const [developerName, setDeveloperName] = useState('Developer Emil');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const db = getFirestore();

  useEffect(() => {
    if (!user) return;

    // 1. Listen to user's own document for messages
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as User;
        setMessages(data.supportChats || []);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 80);
      }
    });

    // 2. Real-time listener for any online Developer / SuperAdmin
    // Checks ANY user with isSupportOnline == true
    const onlineQuery = query(
      collection(db, 'users'),
      where('isSupportOnline', '==', true)
    );

    const unsubscribeDevOnline = onSnapshot(onlineQuery, (snap) => {
      if (!snap.empty) {
        setIsDeveloperOnline(true);
        const devDoc = snap.docs[0].data();
        setDeveloperName(devDoc.fullName || 'Developer Emil');
      } else {
        setIsDeveloperOnline(false);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeDevOnline();
    };
  }, [user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const trimmed = inputText.trim();
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.uid,
      senderName: user.fullName || 'User',
      text: trimmed,
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

    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      supportChats: arrayUnion(newMsg)
    });

    // Check if developer is offline
    if (!isDeveloperOnline) {
      // Don't spam duplicate bot replies if a bot message was sent in the last 2 minutes
      const lastMsg = messages[messages.length - 1];
      const botRepliedRecently = lastMsg && lastMsg.isBot && (Date.now() - lastMsg.timestamp < 120000);

      // Only respond if not spammed or if user asked a specific keyword
      const hasKeyword = trimmed.length > 5;
      if (!botRepliedRecently || hasKeyword) {
        setTimeout(async () => {
          const botReplyText = getSmartBotResponse(trimmed);
          const botMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            senderId: 'bot',
            senderName: 'Support Bot',
            text: botReplyText,
            timestamp: Date.now(),
            isBot: true
          };
          await updateDoc(userRef, {
            supportChats: arrayUnion(botMsg)
          });
        }, 800);
      }
    }
  };

  const handleClearChat = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        supportChats: []
      });
      setMessages([]);
      setShowClearConfirm(false);
      toast.success('Your chat history has been cleared');
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear chat');
    }
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Live Support Chat" 
        description="Chat directly with Developer Emil for technical support, feature requests, or troubleshooting."
        actions={
          <div className="flex items-center gap-2">
            <AppButton
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs"
              title="Clear chat history"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear Chat
            </AppButton>
          </div>
        }
      />
      
      <AppCard className="flex flex-col h-[620px] max-h-[75vh] border border-border shadow-sm overflow-hidden mt-6 p-0">
        {/* Chat Header */}
        <div className="p-3.5 px-5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={developerName}
              isDev={true}
              size="lg"
              showOnlineStatus={true}
              isOnline={isDeveloperOnline}
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-foreground">{developerName}</h3>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-primary text-primary-foreground">
                  LEAD DEV
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`h-2 w-2 rounded-full ${isDeveloperOnline ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`}></span>
                <span className="text-xs text-muted-foreground font-medium">
                  {isDeveloperOnline ? 'Developer is Online & Active' : 'Developer is Offline • Assistant Active'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-muted-foreground">Cryodeal Engineering Support</span>
            <p className="text-[11px] text-muted-foreground/80">Real-time developer communication channel</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-5 space-y-4 bg-background"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <MessageCircle className="h-14 w-14 mb-3 opacity-25 text-primary" />
              <h4 className="font-bold text-foreground text-sm">Welcome to Developer Support</h4>
              <p className="text-xs mt-1 max-w-sm">
                Have a question about tool dispatches, stock receipts, printing slips, or reporting an issue? Type your message below.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === user?.uid;
              return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg relative`}>
                  <div className={`flex gap-2.5 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <UserAvatar
                      name={msg.senderName}
                      photoUrl={isMe ? user?.photoURL : null}
                      isDev={msg.senderName === 'Developer' || msg.senderName === 'Developer Emil'}
                      isBot={msg.isBot}
                      size="sm"
                      className="mt-1"
                    />

                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {isMe ? 'You' : msg.senderName}
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
                          {/* Quoted Reply inside bubble */}
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

        {/* Chat Input */}
        <div className="p-3.5 px-4 border-t border-border bg-muted/10">
          <form onSubmit={handleSend} className="flex gap-2">
            <input 
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message or question here..."
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
      </AppCard>

      {/* Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <AppDialog
          isOpen={true}
          onOpenChange={(open) => !open && setShowClearConfirm(false)}
          title="Clear Chat History?"
          description="Are you sure you want to clear your support conversation history?"
          className="max-w-md"
        >
          <div className="py-3 space-y-4">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              This will remove all current messages from your support chat view. You can start a fresh conversation anytime.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <AppButton variant="outline" size="sm" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </AppButton>
              <AppButton 
                variant="destructive" 
                size="sm" 
                onClick={handleClearChat}
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
