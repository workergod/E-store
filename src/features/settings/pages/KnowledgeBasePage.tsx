import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Book, ChevronRight, Search } from 'lucide-react';
import { PageContainer } from '../../../shared/layouts/PageContainer';
import { PageHeader } from '../../../shared/layouts/PageHeader';
import { AppButton } from '../../../shared/app/AppButton';

const ARTICLES = [
  {
    id: '1',
    category: 'Getting Started',
    title: 'Introduction to E Store Pro',
    description: 'Learn the basics of navigating the dashboard, setting up your profile, and understanding the core features of the platform.',
  },
  {
    id: '2',
    category: 'Inventory',
    title: 'How to Manage Products',
    description: 'A complete guide to adding, editing, and categorizing products in your inventory. Learn about stock alerts and tracking.',
  },
  {
    id: '3',
    category: 'Inventory',
    title: 'Issuing & Returning Materials',
    description: 'Step-by-step instructions for issuing materials to technicians and processing returns back into your warehouse stock.',
  },
  {
    id: '4',
    category: 'Purchasing',
    title: 'Creating Purchase Orders',
    description: 'Learn how to draft purchase orders, select suppliers, and track incoming deliveries for your business.',
  },
  {
    id: '5',
    category: 'Operations',
    title: 'Managing Employees & Roles',
    description: 'Add new staff members, assign roles like Technician or Supervisor, and manage their system access permissions.',
  },
  {
    id: '6',
    category: 'Reporting',
    title: 'Understanding the Transaction Log',
    description: 'How to read, filter, and export the transaction log to keep a clean audit trail of all inventory movements.',
  }
];

export default function KnowledgeBasePage() {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <div className="mb-[var(--spacing-md)]">
        <AppButton variant="ghost" size="sm" onClick={() => navigate('/help')} className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Help Center
        </AppButton>
      </div>

      <PageHeader 
        title="Knowledge Base" 
        description="Detailed guides, tutorials, and step-by-step articles to help you master the platform."
      />

      <div className="relative mb-8 max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search for articles, guides, and FAQs..." 
          className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ARTICLES.map((article) => (
          <div key={article.id} className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col">
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-primary uppercase tracking-wider">
              <Book className="h-4 w-4" />
              {article.category}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 flex-1">
              {article.description}
            </p>
            <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors mt-auto pt-4 border-t border-border/50">
              Read Article <ChevronRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-primary/5 rounded-xl p-8 border border-primary/10 text-center">
        <h3 className="text-xl font-semibold mb-2">Can't find what you're looking for?</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          Our technical support team is available around the clock to help you with any issues not covered in the knowledge base.
        </p>
        <AppButton onClick={() => navigate('/help')}>
          Contact Support
        </AppButton>
      </div>

    </PageContainer>
  );
}
