import React, { useState, useEffect } from 'react';
import { 
  Building2, Mail, Phone, Calendar, ShieldCheck, 
  Trash2, MessageCircle, Clock, X, CheckCircle2, User as UserIcon, AlertTriangle
} from 'lucide-react';
import { AppDialog } from '../../../shared/overlays/AppDialog';
import { AppButton } from '../../../shared/app/AppButton';
import { UserAvatar } from '../../../shared/ui/UserAvatar';
import type { User } from '../../../types/User';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

interface UserProfileModalProps {
  user: User | null;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
  onClearChat?: (userId: string) => void;
  onFocusReply?: () => void;
}

export function UserProfileModal({
  user,
  companyName,
  isOpen,
  onClose,
  onClearChat,
  onFocusReply
}: UserProfileModalProps) {
  const [employeeDetails, setEmployeeDetails] = useState<{
    mobile?: string;
    designation?: string;
    department?: string;
    employeeCode?: string;
  } | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!user || !isOpen) {
      setEmployeeDetails(null);
      setShowClearConfirm(false);
      return;
    }

    const fetchLinkedEmployee = async () => {
      try {
        const db = getFirestore();
        // Try looking up employee record by username or email
        let empQuery = query(
          collection(db, 'employees'),
          where('username', '==', user.username || user.email?.split('@')[0])
        );
        let snap = await getDocs(empQuery);

        if (snap.empty && user.fullName) {
          const parts = user.fullName.split(' ');
          empQuery = query(
            collection(db, 'employees'),
            where('firstName', '==', parts[0])
          );
          snap = await getDocs(empQuery);
        }

        if (!snap.empty) {
          const emp = snap.docs[0].data();
          setEmployeeDetails({
            mobile: emp.mobile || emp.whatsapp,
            designation: emp.designation,
            department: emp.department,
            employeeCode: emp.employeeCode
          });
        }
      } catch (err) {
        console.error('Failed to load linked employee details:', err);
      }
    };

    fetchLinkedEmployee();
  }, [user, isOpen]);

  if (!user) return null;

  const totalMessages = user.supportChats?.length || 0;
  const lastMsg = totalMessages > 0 ? user.supportChats![totalMessages - 1] : null;

  return (
    <AppDialog
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title="User Profile & Account Info"
      description={`Detailed profile for ${user.fullName || user.email}`}
      className="max-w-md"
    >
      <div className="py-2 space-y-5">
        {/* Profile Card Header */}
        <div className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border">
          <UserAvatar
            name={user.fullName}
            email={user.email}
            photoUrl={user.photoURL}
            role={user.role}
            size="xl"
            className="ring-4 ring-primary/20 mb-3"
          />
          <h3 className="text-lg font-bold text-foreground">
            {user.fullName || user.email}
          </h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {user.username || `@${user.email?.split('@')[0]}`}
          </p>

          <div className="flex items-center gap-2 mt-2.5 flex-wrap justify-center">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {user.role || 'Staff Member'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {user.status || 'Active'}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
            <span className="text-muted-foreground flex items-center gap-2 font-medium">
              <Building2 className="h-4 w-4 text-primary" /> Company / Organization
            </span>
            <span className="font-bold text-foreground text-sm">
              {companyName}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
            <span className="text-muted-foreground flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4 text-blue-500" /> Email Address
            </span>
            <span className="font-semibold text-foreground font-mono">
              {user.email || 'N/A'}
            </span>
          </div>

          {employeeDetails?.mobile && (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
              <span className="text-muted-foreground flex items-center gap-2 font-medium">
                <Phone className="h-4 w-4 text-emerald-500" /> Contact Phone
              </span>
              <span className="font-semibold text-foreground">
                {employeeDetails.mobile}
              </span>
            </div>
          )}

          {employeeDetails?.designation && (
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
              <span className="text-muted-foreground flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-purple-500" /> Role & Designation
              </span>
              <span className="font-semibold text-foreground">
                {employeeDetails.designation} {employeeDetails.department ? `(${employeeDetails.department})` : ''}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background">
            <span className="text-muted-foreground flex items-center gap-2 font-medium">
              <MessageCircle className="h-4 w-4 text-amber-500" /> Support History
            </span>
            <span className="font-semibold text-foreground">
              {totalMessages} messages in chat
            </span>
          </div>

          {lastMsg && (
            <div className="p-2.5 rounded-lg border border-border bg-background">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-3.5 w-3.5" /> Latest Message
                </span>
                <span>{new Date(lastMsg.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <p className="text-xs text-foreground font-medium italic truncate bg-muted/30 p-1.5 rounded">
                "{lastMsg.text}"
              </p>
            </div>
          )}
        </div>

        {/* Clear Confirmation Sub-view */}
        {showClearConfirm ? (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-destructive font-bold text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Confirm clear conversation history?</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              This will erase all {totalMessages} messages with {user.fullName || user.email} from the Developer Console. This cannot be undone.
            </p>
            <div className="flex gap-2 pt-1 justify-end">
              <AppButton size="sm" variant="outline" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </AppButton>
              <AppButton
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (onClearChat) onClearChat(user.uid);
                  setShowClearConfirm(false);
                  onClose();
                }}
              >
                Yes, Clear Chat
              </AppButton>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          {onClearChat && !showClearConfirm && (
            <AppButton
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive text-xs"
              onClick={() => setShowClearConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear Chat
            </AppButton>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {onFocusReply && (
              <AppButton
                size="sm"
                onClick={() => {
                  onClose();
                  onFocusReply();
                }}
              >
                <MessageCircle className="h-4 w-4 mr-1.5" /> Send Message
              </AppButton>
            )}
            <AppButton variant="outline" size="sm" onClick={onClose}>
              Done
            </AppButton>
          </div>
        </div>
      </div>
    </AppDialog>
  );
}
