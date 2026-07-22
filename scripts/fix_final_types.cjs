const fs = require('fs');
const path = require('path');

// 1. DashboardPage.tsx
const dashboard = path.join(__dirname, '..', 'src', 'features', 'dashboard', 'pages', 'DashboardPage.tsx');
let content = fs.readFileSync(dashboard, 'utf8');
content = content.replace(/import \{ employeeRepository \} from '\.\.\/\.\.\/\.\.\/repositories\/EmployeeRepository'\n/g, '');
content = content.replace(/import \{ stockLedgerRepository \} from '\.\.\/\.\.\/\.\.\/repositories\/StockLedgerRepository'\n/g, '');
fs.writeFileSync(dashboard, content);

// 2. IssueMaterialsPage.tsx
const issuePage = path.join(__dirname, '..', 'src', 'features', 'inventory', 'pages', 'IssueMaterialsPage.tsx');
content = fs.readFileSync(issuePage, 'utf8');
content = content.replace(/, Save, Trash2/g, ', Trash2');
content = content.replace(/resolver: zodResolver\(issueSchema\),/g, 'resolver: zodResolver(issueSchema) as any,');
fs.writeFileSync(issuePage, content);

// 3. ReturnMaterialsPage.tsx
const returnPage = path.join(__dirname, '..', 'src', 'features', 'inventory', 'pages', 'ReturnMaterialsPage.tsx');
content = fs.readFileSync(returnPage, 'utf8');
content = content.replace(/resolver: zodResolver\(returnSchema\),/g, 'resolver: zodResolver(returnSchema) as any,');
fs.writeFileSync(returnPage, content);

// 4. SettingsPage.tsx
const settingsPage = path.join(__dirname, '..', 'src', 'features', 'settings', 'pages', 'SettingsPage.tsx');
content = fs.readFileSync(settingsPage, 'utf8');
content = content.replace(/import \{ AppForm, FormSection, FormRow, FormActions \} from '\.\.\/\.\.\/\.\.\/shared\/forms\/FormLayout';/g, "import { AppForm, FormRow, FormActions } from '../../../shared/forms/FormLayout';\nimport { FormSection } from '../../../shared/forms/FormSection';");
fs.writeFileSync(settingsPage, content);

// 5. IssueRepository.ts
const issueRepo = path.join(__dirname, '..', 'src', 'repositories', 'IssueRepository.ts');
content = fs.readFileSync(issueRepo, 'utf8');
content = content.replace(/, runTransaction /g, ' ');
content = content.replace(/type \{ IssueTransaction, IssuedItem \}/g, 'type { IssueTransaction }');
fs.writeFileSync(issueRepo, content);

// 6. StockTransaction.ts
const stockTxn = path.join(__dirname, '..', 'src', 'shared', 'types', 'StockTransaction.ts');
content = fs.readFileSync(stockTxn, 'utf8');
content = content.replace(/export type ReferenceType = 'PO' \| 'SALE' \| 'ADJUSTMENT' \| 'TRANSFER' \| 'INITIAL';/g, "export type ReferenceType = 'PO' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'INITIAL' | 'ISSUE' | 'ISSUE_RETURN';");
fs.writeFileSync(stockTxn, content);
