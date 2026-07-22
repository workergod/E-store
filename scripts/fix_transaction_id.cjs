const fs = require('fs');
const path = require('path');

const issueRepo = path.join(__dirname, '..', 'src', 'repositories', 'IssueRepository.ts');
let content = fs.readFileSync(issueRepo, 'utf8');

// The error shows missing `transactionId` in `recordTransaction` calls.
content = content.replace(/companyId: data\.companyId,/g, 'transactionId: `iss_${Date.now()}_${Math.floor(Math.random()*1000)}`,\n          companyId: data.companyId,');
content = content.replace(/companyId,\n          productId:/g, 'transactionId: `ret_${Date.now()}_${Math.floor(Math.random()*1000)}`,\n          companyId,\n          productId:');

fs.writeFileSync(issueRepo, content);
