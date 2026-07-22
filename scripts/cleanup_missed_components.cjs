const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

const moves = [
  { old: 'shared/components/app/ContentSection.tsx', new: 'shared/layouts/ContentSection.tsx' },
  { old: 'shared/components/app/FilterBar.tsx', new: 'shared/layouts/FilterBar.tsx' },
  { old: 'shared/components/app/SectionTitle.tsx', new: 'shared/layouts/SectionTitle.tsx' },
  { old: 'shared/components/app/Toolbar.tsx', new: 'shared/layouts/Toolbar.tsx' },
  { old: 'shared/components/app/StatusBadge.tsx', new: 'shared/feedback/StatusBadge.tsx' },
];

moves.forEach(m => {
  const oldPath = path.join(srcDir, m.old);
  const newPath = path.join(srcDir, m.new);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${m.old} to ${m.new}`);
  }
});

const replacements = [
  { regex: /shared\/components\/app\/ContentSection/g, replacement: 'shared/layouts/ContentSection' },
  { regex: /shared\/components\/app\/FilterBar/g, replacement: 'shared/layouts/FilterBar' },
  { regex: /shared\/components\/app\/SectionTitle/g, replacement: 'shared/layouts/SectionTitle' },
  { regex: /shared\/components\/app\/Toolbar/g, replacement: 'shared/layouts/Toolbar' },
  { regex: /shared\/components\/app\/StatusBadge/g, replacement: 'shared/feedback/StatusBadge' },
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
        if (r.regex.test(content)) {
          content = content.replace(r.regex, r.replacement);
          modified = true;
        }
      });

      // Also fix imports inside the moved files themselves
      if (fullPath.includes('ContentSection.tsx')) {
        if (content.includes('../app/AppCard')) {
          content = content.replace(/\.\.\/app\/AppCard/g, '../app/AppCard');
          modified = true;
        }
      }
      
      if (fullPath.includes('StatusBadge.tsx')) {
        if (content.includes('./AppBadge')) {
          content = content.replace(/\.\/AppBadge/g, '../app/AppBadge');
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
      }
    }
  });
}

processDirectory(srcDir);

// Now try to remove the empty directories
try {
  fs.rmdirSync(path.join(srcDir, 'shared/components/app/forms'));
  fs.rmdirSync(path.join(srcDir, 'shared/components/app'));
  fs.rmdirSync(path.join(srcDir, 'shared/components/layout'));
  fs.rmdirSync(path.join(srcDir, 'shared/components/ui'));
  fs.rmdirSync(path.join(srcDir, 'shared/components'));
  console.log('Removed empty component directories');
} catch (e) {
  console.log('Could not remove some directories, they might not be empty:', e.message);
}
