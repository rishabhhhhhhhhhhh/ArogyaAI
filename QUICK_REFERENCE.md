# Doctor Verification System - Quick Reference

## 🚀 Quick Start

### 1. Run Migration (First Time Only)
```bash
cd Backend
node scripts/migrate-doctor-verification.js
```

### 2. Start Backend
```bash
cd Backend
npm start
```

### 3. Start Frontend
```bash
cd "ArogyaAI Telemedicine Platform"
npm run dev
```

## 📋 Key Routes

### Doctor Routes
- `/doctor/dashboard` - Main dashboard
- `/doctor/verification` - Submit verification documents

### Admin Routes
- `/admin/dashboard` - Admin dashboard with 3 tabs:
  - Doctor Verification (pending applications)
  - Verified Doctors (active doctors)
  - Reports (statistics)

### Patient Routes
- `/patient/book-consultation` - Book with verified doctors only

## 🔑 API Endpoints

### Doctor
```
POST /api/doctors/verification/submit    # Submit verification
GET  /api/doctors/verification/status    # Check status
GET  /api/doctors/me                     # Get profile
```

### Admin
```
GET  /api/admin/stats                    # Platform stats
GET  /api/admin/doctors/pending          # Pending verifications
GET  /api/admin/doctors/verified         # Verified doctors
GET  /api/admin/doctors/:id              # Doctor details
POST /api/admin/doctors/verify/:id       # Approve/Reject
```

## 📊 Verification Status

| Status | Description |
|--------|-------------|
| `pending` | Doctor hasn't submitted documents |
| `submitted` | Documents submitted, awaiting review |
| `under_review` | Admin is reviewing (optional) |
| `verified` | Approved by admin |
| `rejected` | Rejected by admin (can resubmit) |

## ✅ Testing Workflow

### As Doctor
1. Login → `/doctor/verification`
2. Fill form + upload documents
3. Submit
4. Check dashboard for status

### As Admin
1. Login → `/admin/dashboard`
2. Click "Doctor Verification" tab
3. Click "Review Details" on any doctor
4. Approve or Reject

### As Patient
1. Go to book consultation
2. See only verified doctors

## 🔒 Security Checks

- ✅ Only verified doctors in patient list
- ✅ Role-based access control
- ✅ Document validation (5MB, JPG/PNG/PDF)
- ✅ Audit logging

## 📁 Key Files

### Backend
- `models/Doctor.js` - Doctor schema
- `controllers/admin.controller.js` - Admin operations
- `controllers/doctor.controller.js` - Doctor operations
- `routes/admin.routes.js` - Admin routes
- `routes/doctor.routes.js` - Doctor routes

### Frontend
- `pages/DoctorVerification.tsx` - Verification form
- `pages/AdminDashboard.tsx` - Admin dashboard
- `pages/DoctorDashboard.tsx` - Doctor dashboard
- `services/adminService.ts` - Admin API calls
- `services/doctorVerificationService.ts` - Verification API calls

## 🐛 Troubleshooting

### Doctor not in patient list?
Check: `verified: true`, `isVerified: true`, `verificationStatus: 'verified'`, `isActive: true`

### Can't see pending doctors?
Check: Doctor has `verificationStatus: 'submitted'`

### Upload fails?
Check: File size < 5MB, Type is JPG/PNG/PDF

## 📝 Required Documents

1. Medical License (required)
2. Degree Certificate (required)
3. Government ID (required)
4. Additional Certifications (optional)

## 🎯 Success Indicators

- ✅ Doctor can submit verification
- ✅ Admin sees pending applications
- ✅ Admin can approve/reject
- ✅ Verified doctors appear for patients
- ✅ Unverified doctors hidden from patients
- ✅ Real-time data updates

## 📞 Need Help?

1. Check `VERIFICATION_SETUP_GUIDE.md` for detailed setup
2. Check `DOCTOR_VERIFICATION_WORKFLOW.md` for workflow details
3. Check `IMPLEMENTATION_SUMMARY.md` for complete overview
4. Check browser console for errors
5. Check backend logs for API errors
