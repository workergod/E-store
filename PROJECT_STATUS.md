# Project Status: EStore Pro

**Current Version:** v0.5.0

## 🚀 Version Milestones
- **v0.3.0** – Master Data
- **v0.4.0** – Product Management
- **v0.5.0** – Purchases & Suppliers *(Current)*
- **v0.6.0** – Stock Management
- **v0.7.0** – Technician & Issue/Return
- **v0.8.0** – Reports & Printing
- **v0.9.0** – Settings & Company
- **v1.0.0** – Commercial Release

---

## 🚀 Enterprise Roadmap

- **✅ Phase 1: Foundation**
- **✅ Phase 2: Authentication & Security**
- **✅ Phase 3: Master Data**
- **✅ Phase 4: Product Management**
- **✅ Phase 5: Purchase & Supplier Management**
- **✅ Phase 6: Stock Management**
- **⏳ Phase 7: Technician Management** (Employee Architecture, Profiles, Documents, Timelines)
- **Phase 8: Issue & Return Management**
- **Phase 9: Reports & Printing**
- **Phase 10: Company Settings & Backup**
- **Phase 11: Sales & Billing**
- **Phase 12: Customer Management**
- **Phase 13: Licensing & Activation**
- **Phase 14: Auto Update**
- **Phase 15: Backup & Restore**
- **Phase 16: Final QA & Commercial Release**

---

## 🌟 Value-Add Commercial Features
- **Barcode/QR Support:** USB Barcode Scanner integration, automated label generation & printing.
- **Import/Export:** Excel, CSV, Bulk Product Import/Update.
- **Backup Strategy:** Automatic, Manual, Cloud capabilities.
- **Audit Logging:** Every critical action tracked (Deleted Products, Changed Stock, Settings Changes, Logins).
- **Global Search:** Top-level global search instead of module-specific.

---

## 📂 Folder Structure
```text
src/
├── features/
│   ├── auth/          (Components, Hooks, Pages, Types, Services)
│   ├── dashboard/     (Pending)
│   ├── masterData/    (Pending - Phase 3)
│   ├── products/      (Pending - Phase 4)
│   ├── suppliers/     (Pending - Phase 5)
│   ├── purchases/     (Pending - Phase 6)
│   ├── stock/         (Pending - Phase 7)
│   ├── technicians/   (Pending - Phase 8)
│   ├── issue/         (Pending - Phase 9)
│   ├── reports/       (Pending - Phase 10)
│   ├── sales/         (Pending - Phase 11)
│   ├── customers/     (Pending - Phase 12)
│   └── settings/      (Pending - Phase 13)
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   ├── constants/
│   └── utils/
├── store/
├── repositories/
└── firebase/
```

---

## 🗄️ Firebase Collections
- `users`: Individual user records, linked to `companyId`.
- `companies`: Tenant records for multi-company isolation.
- `auditLogs`: Tracking of system actions.
- `loginHistory`: Authentication metrics.
- *(Future)* `categories`, `brands`, `units`, `racks`, `templates`, `products`, `stock`, `technicians`, etc.

---

## 🛡️ Roles
- **SuperAdmin**: Software Owner. Bypasses company restrictions.
- **Owner**: Company owner. Highest privilege within a specific company.
- **Admin**: High privilege. Can manage users, settings, and full data access.
- **Manager**: Mid privilege. Can manage stock, technicians, and most operations.
- **Staff**: Low privilege. Can issue/return products but has restricted management access.
- **Viewer**: Read-only access to reports and data.
