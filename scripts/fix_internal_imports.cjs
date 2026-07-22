const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');
const sharedDir = path.join(srcDir, 'shared');
const componentsDir = path.join(sharedDir, 'components');

// 1. Move missed directories
const dirsToMove = ['documents', 'master-data'];
dirsToMove.forEach(dir => {
  const oldPath = path.join(componentsDir, dir);
  const newPath = path.join(sharedDir, dir);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Moved ${oldPath} -> ${newPath}`);
  }
});

// Remove components dir if empty
if (fs.existsSync(componentsDir) && fs.readdirSync(componentsDir).length === 0) {
  fs.rmdirSync(componentsDir);
}

// 2. Fix all relative paths inside src/shared/*/*.tsx
function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      // Fix cn import (which is at src/shared/utils/cn.ts)
      // From src/shared/X/Y.tsx, it's ../utils/cn
      // From src/shared/X/Y/Z.tsx, it's ../../utils/cn
      const relativeDepth = path.relative(sharedDir, path.dirname(fullPath)).split(path.sep).length;
      
      const fixPaths = [
        { regex: /from\s+["']\.\.\/\.\.\/utils\/cn["']/g, replacement: `from "${'../'.repeat(relativeDepth)}utils/cn"` },
        { regex: /from\s+["']\.\.\/\.\.\/\.\.\/utils\/cn["']/g, replacement: `from "${'../'.repeat(relativeDepth)}utils/cn"` },
        
        // Fix authStore (at src/store/authStore)
        // From src/shared/X/Y.tsx (depth 1), it's ../../store/authStore
        { regex: /from\s+["']\.\.\/\.\.\/\.\.\/store\/authStore["']/g, replacement: `from "${'../'.repeat(relativeDepth + 1)}store/authStore"` },

        // Internal cross-folder imports in shared (e.g. from tables to app)
        // This is tricky. Let's just fix the specific ones that failed.
      ];

      fixPaths.forEach(r => {
        if (r.regex.test(content)) {
          content = content.replace(r.regex, r.replacement);
          modified = true;
        }
      });

      // Specific cross-folder fixes based on the error log
      const crossFolderFixes = [
        // tables/AppTable.tsx
        { regex: /from\s+["']\.\/AppCard["']/g, replacement: `from "../app/AppCard"` },
        { regex: /from\s+["']\.\/SearchBar["']/g, replacement: `from "../forms/SearchBar"` },
        { regex: /from\s+["']\.\/EmptyState["']/g, replacement: `from "../feedback/EmptyState"` },
        { regex: /from\s+["']\.\/AppErrorState["']/g, replacement: `from "../feedback/AppErrorState"` },
        { regex: /from\s+["']\.\/AppSkeleton["']/g, replacement: `from "../skeletons/AppSkeleton"` },
        
        // feedback/EmptyState.tsx
        { regex: /from\s+["']\.\/AppCard["']/g, replacement: `from "../app/AppCard"` },
        
        // feedback/AppErrorState.tsx
        { regex: /from\s+["']\.\/AppButton["']/g, replacement: `from "../app/AppButton"` },
        
        // forms/FormInput.tsx
        { regex: /from\s+["']\.\.\/AppInput["']/g, replacement: `from "./AppInput"` },
        { regex: /from\s+["']\.\.\/\.\.\/ui\/Label["']/g, replacement: `from "../ui/Label"` },
        
        // forms/FormSection.tsx
        { regex: /from\s+["']\.\.\/AppCard["']/g, replacement: `from "../app/AppCard"` },

        // forms/FormSelect.tsx, FormTextarea.tsx
        { regex: /from\s+["']\.\.\/\.\.\/ui\/Label["']/g, replacement: `from "../ui/Label"` },

        // widgets/MetricWidget.tsx, ChartWidget.tsx
        { regex: /from\s+["']\.\/AppCard["']/g, replacement: `from "../app/AppCard"` },
      ];

      if (fullPath.includes('shared')) {
        crossFolderFixes.forEach(r => {
          if (r.regex.test(content)) {
            content = content.replace(r.regex, r.replacement);
            modified = true;
          }
        });
      }

      if (modified) {
        fs.writeFileSync(fullPath, content);
      }
    }
  });
}

processDirectory(srcDir);
console.log('Fixed relative imports and missed directories.');
