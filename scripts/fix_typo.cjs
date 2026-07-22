const fs = require('fs');
const path = require('path');

// 1. Fix IssueMaterialsPage.tsx (remove employeeCode from create)
const issuePage = path.join(__dirname, '..', 'src', 'features', 'inventory', 'pages', 'IssueMaterialsPage.tsx');
let content = fs.readFileSync(issuePage, 'utf8');
content = content.replace(/employeeCode: `EMP\$\{Date\.now\(\)\.toString\(\)\.slice\(-4\)\}`,/g, '');
fs.writeFileSync(issuePage, content);

// 2. Fix ProductsPage.tsx
const productsPage = path.join(__dirname, '..', 'src', 'features', 'products', 'pages', 'ProductsPage.tsx');
content = fs.readFileSync(productsPage, 'utf8');
// Fix 'user' reference -> the destructuring `const { company } = useAuthStore();` doesn't include user.
content = content.replace(/const { company } = useAuthStore\(\);/g, 'const { user, company } = useAuthStore();');
// Fix missing isSerialized
content = content.replace(/status: 'Active' as const, sku:/g, "status: 'Active' as const, isSerialized: false, sku:");
fs.writeFileSync(productsPage, content);
