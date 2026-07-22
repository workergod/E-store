const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src');

const replacements = [
  // Fix authStore in features
  { regex: /\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/store\/authStore/g, replacement: '../../../store/authStore' },
  { regex: /\.\.\/\.\.\/\.\.\/\.\.\/store\/authStore/g, replacement: '../../store/authStore' },

  // Fix master-data missed imports
  { regex: /shared\/components\/master-data\//g, replacement: 'shared/master-data/' },
  
  // Fix documents missed imports
  { regex: /shared\/components\/documents\//g, replacement: 'shared/documents/' },

  // Fix ContentSection -> AppCard
  { regex: /\.\.\/app\/AppCard/g, replacement: '../app/AppCard' }, // wait, ContentSection is in src/shared/components/app? It wasn't moved!
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

      // Specific fix for ContentSection.tsx and StatusBadge.tsx that weren't moved?
      // Wait, if ContentSection is still in shared/components/app/ContentSection.tsx, I should move it.
      // Let's just fix the imports for now.

      // Fix DocumentUploader imports (moved to shared/documents)
      // from src/shared/documents/DocumentUploader.tsx to src/services/FileUploadService is ../../services
      if (fullPath.includes('DocumentUploader.tsx')) {
        const uploaderFixes = [
          { regex: /\.\.\/\.\.\/\.\.\/services/g, replacement: '../../services' },
          { regex: /\.\.\/\.\.\/\.\.\/repositories/g, replacement: '../../repositories' },
          { regex: /\.\.\/\.\.\/types/g, replacement: '../../shared/types' }
        ];
        uploaderFixes.forEach(r => {
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
