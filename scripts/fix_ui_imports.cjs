const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  { old: 'shared/components/layout/AppShell', new: 'shared/layouts/AppShell' },
  { old: 'shared/components/layout/Sidebar', new: 'shared/layouts/Sidebar' },
  { old: 'shared/components/layout/ProtectedRoute', new: 'shared/layouts/ProtectedRoute' },
  { old: 'shared/components/layout/PublicRoute', new: 'shared/layouts/PublicRoute' },
  { old: 'shared/components/app/PageContainer', new: 'shared/layouts/PageContainer' },
  { old: 'shared/components/app/PageHeader', new: 'shared/layouts/PageHeader' },
  
  { old: 'shared/components/app/AppButton', new: 'shared/app/AppButton' },
  { old: 'shared/components/app/AppCard', new: 'shared/app/AppCard' },
  { old: 'shared/components/app/AppBadge', new: 'shared/app/AppBadge' },
  { old: 'shared/components/app/AvatarGroup', new: 'shared/app/AppAvatarGroup' },
  
  { old: 'shared/components/app/AppTable', new: 'shared/tables/AppTable' },
  
  { old: 'shared/components/app/forms/FormLayout', new: 'shared/forms/FormLayout' },
  { old: 'shared/components/app/forms/FormSection', new: 'shared/forms/FormSection' },
  { old: 'shared/components/app/forms/FormInput', new: 'shared/forms/FormInput' },
  { old: 'shared/components/app/forms/FormSelect', new: 'shared/forms/FormSelect' },
  { old: 'shared/components/app/forms/FormTextarea', new: 'shared/forms/FormTextarea' },
  { old: 'shared/components/app/AppInput', new: 'shared/forms/AppInput' },
  { old: 'shared/components/app/SearchBar', new: 'shared/forms/SearchBar' },
  
  { old: 'shared/components/app/AppErrorState', new: 'shared/feedback/AppErrorState' },
  { old: 'shared/components/app/EmptyState', new: 'shared/feedback/EmptyState' },
  { old: 'shared/components/app/LoadingState', new: 'shared/feedback/LoadingState' },
  
  { old: 'shared/components/app/AppTabs', new: 'shared/navigation/AppTabs' },
  { old: 'shared/components/app/AppDialog', new: 'shared/overlays/AppDialog' },
  
  { old: 'shared/components/app/MetricCard', new: 'shared/widgets/MetricWidget' },
  { old: 'shared/components/app/StatsCard', new: 'shared/widgets/MetricWidget' },
  { old: 'shared/components/app/ChartCard', new: 'shared/widgets/ChartWidget' },
  
  { old: 'shared/components/app/AppSkeleton', new: 'shared/skeletons/AppSkeleton' },
  
  { old: 'shared/components/ui', new: 'shared/ui' }
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      replacements.forEach(r => {
        // Replace exact import matches and relative matches
        // E.g. '../../../shared/components/layout/AppShell' -> '../../../shared/layouts/AppShell'
        const regex = new RegExp(r.old, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, r.new);
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated imports in ${fullPath}`);
      }
    }
  });
}

processDirectory(srcDir);
console.log('Finished updating imports.');
