const fs = require('fs');
const path = require('path');

const issueRepo = path.join(__dirname, '..', 'src', 'repositories', 'IssueRepository.ts');
let content = fs.readFileSync(issueRepo, 'utf8');

content = content.replace(/date: new Date\(\),\n/g, '');

fs.writeFileSync(issueRepo, content);
