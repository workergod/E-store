const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const sharedDir = path.join(srcDir, 'shared');
const componentsDir = path.join(sharedDir, 'components');

const dirsToCreate = [
  'layouts', 'app', 'charts', 'tables', 'forms', 
  'feedback', 'navigation', 'overlays', 'widgets', 'skeletons', 'ui'
];

dirsToCreate.forEach(dir => {
  const fullPath = path.join(sharedDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Define mapping of old paths to new paths (relative to src)
const fileMoves = [
  // Layouts
  { old: 'shared/components/layout/AppShell.tsx', new: 'shared/layouts/AppShell.tsx' },
  { old: 'shared/components/layout/Sidebar.tsx', new: 'shared/layouts/Sidebar.tsx' },
  { old: 'shared/components/layout/ProtectedRoute.tsx', new: 'shared/layouts/ProtectedRoute.tsx' },
  { old: 'shared/components/layout/PublicRoute.tsx', new: 'shared/layouts/PublicRoute.tsx' },
  { old: 'shared/components/app/PageContainer.tsx', new: 'shared/layouts/PageContainer.tsx' },
  { old: 'shared/components/app/PageHeader.tsx', new: 'shared/layouts/PageHeader.tsx' },

  // App (Primitives)
  { old: 'shared/components/app/AppButton.tsx', new: 'shared/app/AppButton.tsx' },
  { old: 'shared/components/app/AppCard.tsx', new: 'shared/app/AppCard.tsx' },
  { old: 'shared/components/app/AppBadge.tsx', new: 'shared/app/AppBadge.tsx' },
  { old: 'shared/components/app/AvatarGroup.tsx', new: 'shared/app/AppAvatarGroup.tsx' },
  
  // Tables
  { old: 'shared/components/app/AppTable.tsx', new: 'shared/tables/AppTable.tsx' },

  // Forms
  { old: 'shared/components/app/AppInput.tsx', new: 'shared/forms/AppInput.tsx' },
  { old: 'shared/components/app/SearchBar.tsx', new: 'shared/forms/SearchBar.tsx' },
  { old: 'shared/components/app/forms/FormLayout.tsx', new: 'shared/forms/FormLayout.tsx' },
  { old: 'shared/components/app/forms/FormSection.tsx', new: 'shared/forms/FormSection.tsx' },
  { old: 'shared/components/app/forms/FormInput.tsx', new: 'shared/forms/FormInput.tsx' },
  { old: 'shared/components/app/forms/FormSelect.tsx', new: 'shared/forms/FormSelect.tsx' },
  { old: 'shared/components/app/forms/FormTextarea.tsx', new: 'shared/forms/FormTextarea.tsx' },

  // Feedback
  { old: 'shared/components/app/AppErrorState.tsx', new: 'shared/feedback/AppErrorState.tsx' },
  { old: 'shared/components/app/EmptyState.tsx', new: 'shared/feedback/EmptyState.tsx' },
  { old: 'shared/components/app/LoadingState.tsx', new: 'shared/feedback/LoadingState.tsx' },

  // Navigation
  { old: 'shared/components/app/AppTabs.tsx', new: 'shared/navigation/AppTabs.tsx' },

  // Overlays
  { old: 'shared/components/app/AppDialog.tsx', new: 'shared/overlays/AppDialog.tsx' },

  // Widgets
  { old: 'shared/components/app/MetricCard.tsx', new: 'shared/widgets/MetricWidget.tsx' },
  { old: 'shared/components/app/ChartCard.tsx', new: 'shared/widgets/ChartWidget.tsx' },

  // Skeletons
  { old: 'shared/components/app/AppSkeleton.tsx', new: 'shared/skeletons/AppSkeleton.tsx' },

  // UI (Shadcn) - move everything from shared/components/ui to shared/ui
  ...fs.existsSync(path.join(componentsDir, 'ui')) ? fs.readdirSync(path.join(componentsDir, 'ui')).map(file => ({
    old: `shared/components/ui/${file}`,
    new: `shared/ui/${file}`
  })) : []
];

// Execute moves
fileMoves.forEach(move => {
  const oldPath = path.join(srcDir, move.old);
  const newPath = path.join(srcDir, move.new);
  
  if (fs.existsSync(oldPath)) {
    // Ensure parent dir exists
    const parentDir = path.dirname(newPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${move.old} -> ${move.new}`);
  }
});

// We'll run fix_imports_v2.cjs afterwards to fix everything.
console.log('Done moving files.');
