const fs = require('fs');
const path = require('path');

// 1. PurchaseOrderDetails.tsx
const poDetails = path.join(__dirname, '..', 'src', 'features', 'purchases', 'pages', 'PurchaseOrderDetails.tsx');
let content = fs.readFileSync(poDetails, 'utf8');
content = content.replace(/  const getStatusType = \(status: string\) => \{\n    switch \(status\) \{\n      case 'Draft': return 'default';\n      case 'Approved': return 'info';\n      case 'Partially Received': return 'warning';\n      case 'Completed': return 'success';\n      case 'Cancelled': return 'error';\n      default: return 'default';\n    \}\n  \};\n\n/g, '');
fs.writeFileSync(poDetails, content);

// 2. PurchaseOrdersPage.tsx
const poPage = path.join(__dirname, '..', 'src', 'features', 'purchases', 'pages', 'PurchaseOrdersPage.tsx');
content = fs.readFileSync(poPage, 'utf8');
content = content.replace(/  const \[searchQuery, setSearchQuery\] = useState\(''\);\n/g, '');
content = content.replace(/  const filteredPOs = pos\.filter\(po => \n    po\.poNumber\.toLowerCase\(\)\.includes\(searchQuery\.toLowerCase\(\)\) \|\| \n    \(suppliers\[po\.supplierId\]\?\.companyName \|\| ''\)\.toLowerCase\(\)\.includes\(searchQuery\.toLowerCase\(\)\)\n  \);\n\n/g, '');
content = content.replace(/emptyStateDescription/g, 'emptyDescription');
fs.writeFileSync(poPage, content);
