# Firestore Security Rules Architecture

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Function to check if the user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Function to fetch the user's role from the users collection
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    // Function to get the user's company ID
    function getUserCompanyId() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.companyId;
    }

    function isSuperAdmin() {
      return getUserRole() == 'SuperAdmin';
    }

    function isOwner() {
      return getUserRole() == 'Owner';
    }

    // -----------------------------------------------------
    // USERS COLLECTION
    // -----------------------------------------------------
    match /users/{userId} {
      allow read: if isAuthenticated() && (
        request.auth.uid == userId || 
        isSuperAdmin() ||
        (isOwner() && resource.data.companyId == getUserCompanyId())
      );
      
      allow create: if isAuthenticated() && (
        isSuperAdmin() || 
        (isOwner() && request.resource.data.companyId == getUserCompanyId())
      );

      allow update: if isAuthenticated() && (
        request.auth.uid == userId || 
        isSuperAdmin() ||
        (isOwner() && resource.data.companyId == getUserCompanyId())
      );
    }

    // -----------------------------------------------------
    // COMPANIES COLLECTION
    // -----------------------------------------------------
    match /companies/{companyId} {
      allow read: if isAuthenticated() && (
        isSuperAdmin() || resource.id == getUserCompanyId()
      );
      
      allow write: if isAuthenticated() && isSuperAdmin();
    }
  }
}
```
