const fs = require('fs');
const path = require('path');

const issuePage = path.join(__dirname, '..', 'src', 'features', 'inventory', 'pages', 'IssueMaterialsPage.tsx');
let content = fs.readFileSync(issuePage, 'utf8');

// The line is:
// role: 'Technician',
// }, user.uid);
content = content.replace(/role: 'Technician',\n\s*}, user\.uid\);/g, `role: 'Technician',
          mobile: 'N/A',
          createdBy: user.uid,
          joiningDate: new Date(),
        }, user.uid);`);

fs.writeFileSync(issuePage, content);
