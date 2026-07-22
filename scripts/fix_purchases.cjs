const fs = require('fs');
const path = require('path');

// 1. PurchaseOrdersPage.tsx
const poPage = path.join(__dirname, '..', 'src', 'features', 'purchases', 'pages', 'PurchaseOrdersPage.tsx');
let content = fs.readFileSync(poPage, 'utf8');
// Fix PageHeader actions
content = content.replace(/action=\{/g, 'actions={');
// Fix StatusBadge children
content = content.replace(/<StatusBadge status=\{getStatusType\(row\.status\)\}>\s*\{row\.status\}\s*<\/StatusBadge>/g, '<StatusBadge status={row.status} />');
// Fix ColumnDef
content = content.replace(/cell: \(row: PurchaseOrder\) =>/g, 'cell: ({ row }: any) =>');
content = content.replace(/row\.poNumber/g, 'row.original.poNumber');
content = content.replace(/row\.purchaseDate/g, 'row.original.purchaseDate');
content = content.replace(/row\.supplierId/g, 'row.original.supplierId');
content = content.replace(/row\.totalAmount/g, 'row.original.totalAmount');
content = content.replace(/row\.status/g, 'row.original.status');
content = content.replace(/row\.id/g, 'row.original.id');
fs.writeFileSync(poPage, content);

// 2. PurchaseOrderDetails.tsx
const poDetails = path.join(__dirname, '..', 'src', 'features', 'purchases', 'pages', 'PurchaseOrderDetails.tsx');
content = fs.readFileSync(poDetails, 'utf8');
// Remove AppTable import
content = content.replace(/import \{ AppTable \} from '\.\.\/\.\.\/\.\.\/shared\/tables\/AppTable';\n/, '');
// Fix PageHeader actions
content = content.replace(/action=\{/g, 'actions={');
// Fix StatusBadge
content = content.replace(/<StatusBadge status=\{getStatusType\(po\.status\)\}>\{po\.status\}<\/StatusBadge>/g, '<StatusBadge status={po.status} />');
fs.writeFileSync(poDetails, content);

// 3. PurchaseOrderForm.tsx
const poForm = path.join(__dirname, '..', 'src', 'features', 'purchases', 'pages', 'PurchaseOrderForm.tsx');
content = fs.readFileSync(poForm, 'utf8');
// Replace FormInput, FormSelect, FormTextarea with raw elements inside FormField
content = content.replace(/<FormSelect/g, '<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"');
content = content.replace(/options=\{\[\{ label: 'Select Supplier', value: '' \}, \.\.\.suppliers\.map\(s => \(\{ label: s\.companyName, value: s\.id!\}\)\)\]\}/g, '> <option value="">Select Supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}</select');

content = content.replace(/<FormInput/g, '<AppInput');

content = content.replace(/<FormTextarea/g, '<textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"');
content = content.replace(/rows=\{4\} \/>/g, 'rows={4}></textarea>');
fs.writeFileSync(poForm, content);

// 4. Sidebar.tsx
const sidebar = path.join(__dirname, '..', 'src', 'shared', 'layouts', 'Sidebar.tsx');
content = fs.readFileSync(sidebar, 'utf8');
content = content.replace(/FileText, /g, '');
content = content.replace(/Truck, /g, '');
content = content.replace(/Database, /g, '');
fs.writeFileSync(sidebar, content);

// 5. StatusBadge.tsx
const statusBadge = path.join(__dirname, '..', 'src', 'shared', 'feedback', 'StatusBadge.tsx');
content = fs.readFileSync(statusBadge, 'utf8');
content = content.replace(/if \(s === 'ACTIVE' \|\| s === 'COMPLETED' \|\| s === 'DELIVERED'\) \{/g, "if (s === 'ACTIVE' || s === 'COMPLETED' || s === 'DELIVERED') {\n    variant = 'softSuccess'\n  } else if (s === 'PARTIALLY RECEIVED') {\n    variant = 'softWarning'\n  } else if (s === 'DRAFT') {");
fs.writeFileSync(statusBadge, content);
