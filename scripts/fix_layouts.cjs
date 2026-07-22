const fs = require('fs');
const path = require('path');

const filesToFix = [
  'ContentSection.tsx',
  'FilterBar.tsx',
  'SectionTitle.tsx',
  'Toolbar.tsx'
];

filesToFix.forEach(f => {
  const fp = path.join(__dirname, '..', 'src', 'shared', 'layouts', f);
  if (fs.existsSync(fp)) {
    let content = fs.readFileSync(fp, 'utf8');
    content = content.replace(/\.\.\/\.\.\/utils\/cn/g, '../utils/cn');
    fs.writeFileSync(fp, content);
  }
});

const sidebarPath = path.join(__dirname, '..', 'src', 'shared', 'layouts', 'Sidebar.tsx');
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, 'utf8');
  content = content.replace(/Zap\n} from 'lucide-react'/, '} from \'lucide-react\'');
  fs.writeFileSync(sidebarPath, content);
}
