import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { LifeBuoy, BookOpen, Mail, MessageCircle, FileText } from 'lucide-react';

export default function HelpPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Help & Support" 
        description="Find answers to your questions and get in touch with our support team." 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Knowledge Base */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-start transition-all hover:shadow-md cursor-pointer">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
            <BookOpen className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Knowledge Base</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Browse our detailed guides, tutorials, and step-by-step articles to master the E Store Pro platform.
          </p>
          <span className="text-primary text-sm font-medium mt-auto flex items-center">
            Read Articles &rarr;
          </span>
        </div>

        {/* Video Tutorials */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-start transition-all hover:shadow-md cursor-pointer">
          <div className="h-12 w-12 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center text-[hsl(var(--success))] mb-4">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Video Tutorials</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Watch quick video lessons covering everything from inventory adjustments to employee management.
          </p>
          <span className="text-[hsl(var(--success))] text-sm font-medium mt-auto flex items-center">
            Watch Videos &rarr;
          </span>
        </div>

        {/* Contact Support */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-start transition-all hover:shadow-md cursor-pointer">
          <div className="h-12 w-12 rounded-lg bg-[hsl(var(--destructive))]/10 flex items-center justify-center text-[hsl(var(--destructive))] mb-4">
            <LifeBuoy className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Contact Support</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Need direct assistance? Our dedicated technical team is available 24/7 to resolve your issues.
          </p>
          <div className="flex flex-col gap-2 w-full mt-auto">
            <a href="mailto:edgaredgefx@gmail.com" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <Mail className="h-4 w-4 mr-2" /> edgaredgefx@gmail.com
            </a>
            <span className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <MessageCircle className="h-4 w-4 mr-2" /> Live Chat Available
            </span>
          </div>
        </div>

      </div>

      <div className="mt-12 bg-muted/30 rounded-xl p-8 border border-border">
        <h3 className="text-xl font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <details className="group border-b border-border pb-4 cursor-pointer">
            <summary className="font-medium text-foreground outline-none">How do I issue materials to a new technician?</summary>
            <p className="text-muted-foreground text-sm mt-2">
              Navigate to "Issue Materials" under Inventory. Simply type the name of the new technician in the employee field. If they don't exist in the system, E Store Pro will automatically create their profile for you and assign the materials to them instantly.
            </p>
          </details>
          <details className="group border-b border-border pb-4 cursor-pointer">
            <summary className="font-medium text-foreground outline-none">Can I process a partial material return?</summary>
            <p className="text-muted-foreground text-sm mt-2">
              Yes. Go to "Return Materials", select the active issue from the dropdown, and specify exactly how much is being returned in the "Return Qty Now" column. The remaining amount will be logged as used.
            </p>
          </details>
          <details className="group border-b border-border pb-4 cursor-pointer">
            <summary className="font-medium text-foreground outline-none">How is my stock value calculated on the dashboard?</summary>
            <p className="text-muted-foreground text-sm mt-2">
              The Estimated Stock Value is calculated by taking your current on-hand stock for each product and multiplying it by its respective purchase price.
            </p>
          </details>
        </div>
      </div>
    </PageContainer>
  );
}
