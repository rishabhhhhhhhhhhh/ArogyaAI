# Doctor Verification System - Testing Checklist

## Pre-Testing Setup

- [ ] Backend is running (`npm start` in Backend folder)
- [ ] Frontend is running (`npm run dev` in ArogyaAI Telemedicine Platform folder)
- [ ] Database migration completed (`node Backend/scripts/migrate-doctor-verification.js`)
- [ ] MongoDB is connected and accessible

## 1. Doctor Registration & Verification Submission

### Register New Doctor
- [ ] Navigate to `/register`
- [ ] Select "Doctor" role
- [ ] Fill in email and password
- [ ] Successfully register
- [ ] Redirected to doctor dashboard

### Check Initial Status
- [ ] Doctor dashboard shows "Pending Verification" status
- [ ] Yellow banner appears prompting to complete verification
- [ ] "Complete Verification" button is visible

### Submit Verification
- [ ] Click "Complete Verification" or navigate to `/doctor/verification`
- [ ] Verification page loads correctly
- [ ] All form fields are visible

#### Fill Personal Information
- [ ] Enter Medical Registration Number (e.g., MD-12345-2020)
- [ ] Enter Specialization (e.g., Cardiologist)
- [ ] Enter Years of Experience (e.g., 10)
- [ ] Enter Phone Number
- [ ] Enter Address
- [ ] Enter Qualifications (comma-separated)
- [ ] Enter Languages (comma-separated)

#### Fill Education
- [ ] Enter Degree (e.g., MBBS)
- [ ] Enter Institution (e.g., Harvard Medical School)
- [ ] Enter Graduation Year (e.g., 2015)

#### Fill Clinic Information (Optional)
- [ ] Enter Clinic Name
- [ ] Enter Clinic Phone
- [ ] Enter Clinic Address

#### Fill Professional Bio
- [ ] Enter professional bio (at least 50 characters)

#### Upload Documents
- [ ] Upload Medical License (JPG/PNG/PDF, < 5MB)
  - [ ] Green checkmark appears after upload
- [ ] Upload Degree Certificate (JPG/PNG/PDF, < 5MB)
  - [ ] Green checkmark appears after upload
- [ ] Upload Government ID (JPG/PNG/PDF, < 5MB)
  - [ ] Green checkmark appears after upload

#### Submit
- [ ] Click "Submit for Verification"
- [ ] Success toast appears
- [ ] Redirected to doctor dashboard
- [ ] Status changes to "Submitted" or "Under Review"

## 2. Admin Review & Approval

### Login as Admin
- [ ] Logout from doctor account
- [ ] Login with admin credentials
- [ ] Navigate to `/admin/dashboard`

### Check Statistics
- [ ] Top metrics display correctly:
  - [ ] Total Users count
  - [ ] Verified Doctors count
  - [ ] Pending Approvals count (should be > 0)
  - [ ] Total Appointments count

### View Pending Verifications
- [ ] Click "Doctor Verification" tab
- [ ] Pending doctors list appears
- [ ] Newly submitted doctor appears in list
- [ ] Doctor information displays correctly:
  - [ ] Name (Dr. FirstName LastName)
  - [ ] Specialization
  - [ ] Years of experience
  - [ ] Email
  - [ ] Registration number
  - [ ] Documents list
  - [ ] Status badge shows "submitted"

### Review Doctor Details
- [ ] Click "Review Details" button
- [ ] Modal opens with complete information
- [ ] All sections visible:
  - [ ] Profile picture/avatar
  - [ ] Contact Information (email, phone, address)
  - [ ] Credentials (license, experience, languages)
  - [ ] Qualifications (badges)
  - [ ] Education history
  - [ ] Clinic information (if provided)
  - [ ] Professional bio
  - [ ] Uploaded documents list
- [ ] All data matches what doctor submitted

### Test Approval
- [ ] Click "Approve & Verify" button
- [ ] Success toast appears: "Dr. [Name] has been approved and verified!"
- [ ] Modal closes
- [ ] Doctor disappears from pending list
- [ ] Pending Approvals count decreases by 1
- [ ] Verified Doctors count increases by 1

### Verify in Verified Doctors Tab
- [ ] Click "Verified Doctors" tab
- [ ] Approved doctor appears in list
- [ ] Status shows "Active"
- [ ] Experience and rating display correctly

## 3. Test Rejection Flow

### Submit Another Doctor for Testing
- [ ] Register another doctor account
- [ ] Submit verification with different information
- [ ] Login as admin

### Reject Doctor
- [ ] Navigate to pending verifications
- [ ] Click "Review Details" on new doctor
- [ ] Click "Reject Application" button
- [ ] Rejection dialog opens
- [ ] Enter rejection reason (e.g., "Incomplete documentation")
- [ ] Click "Confirm Rejection"
- [ ] Error toast appears with rejection message
- [ ] Modal closes
- [ ] Doctor disappears from pending list

### Verify Rejection
- [ ] Logout from admin
- [ ] Login as rejected doctor
- [ ] Navigate to `/doctor/verification`
- [ ] Status badge shows "rejected"
- [ ] Rejection reason is displayed
- [ ] Can resubmit with corrections

## 4. Patient View - Verified Doctors Only

### Login as Patient
- [ ] Logout from doctor/admin account
- [ ] Login with patient credentials
- [ ] Navigate to `/patient/book-consultation`

### Verify Doctor List
- [ ] Only verified doctors appear in list
- [ ] Approved doctor from test #2 is visible
- [ ] Rejected doctor from test #3 is NOT visible
- [ ] Unverified doctors are NOT visible
- [ ] Each doctor shows:
  - [ ] Name
  - [ ] Specialization
  - [ ] Experience
  - [ ] Rating
  - [ ] Consultation fee
  - [ ] "Book Appointment" button

## 5. Data Refresh & Real-time Updates

### Test Refresh Functionality
- [ ] Login as admin
- [ ] Navigate to admin dashboard
- [ ] Click "Refresh" button
- [ ] Loading spinner appears
- [ ] Data updates successfully
- [ ] Success toast appears

### Test Tab Switching
- [ ] Switch between tabs:
  - [ ] Doctor Verification tab loads correctly
  - [ ] Verified Doctors tab loads correctly
  - [ ] Reports tab loads correctly
- [ ] Data persists when switching back

## 6. Edge Cases & Error Handling

### Test File Upload Validation
- [ ] Try uploading file > 5MB
  - [ ] Error toast appears
- [ ] Try uploading wrong file type (e.g., .txt)
  - [ ] Error toast appears
- [ ] Try submitting without required documents
  - [ ] Error toast appears

### Test Form Validation
- [ ] Try submitting without registration number
  - [ ] Error message appears
- [ ] Try submitting without specialization
  - [ ] Error message appears
- [ ] Try submitting without phone number
  - [ ] Error message appears

### Test Rejection Without Reason
- [ ] Try to reject doctor without entering reason
  - [ ] "Confirm Rejection" button is disabled
  - [ ] OR error message appears

## 7. Database Verification

### Check Doctor Document in MongoDB
- [ ] Open MongoDB (Compass or CLI)
- [ ] Find approved doctor document
- [ ] Verify fields:
  - [ ] `verified: true`
  - [ ] `isVerified: true`
  - [ ] `verificationStatus: 'verified'`
  - [ ] `verificationCompletedAt` has timestamp
  - [ ] `verificationDocuments` contains URLs
  - [ ] All submitted data is saved

### Check Rejected Doctor
- [ ] Find rejected doctor document
- [ ] Verify fields:
  - [ ] `verified: false`
  - [ ] `isVerified: false`
  - [ ] `verificationStatus: 'rejected'`
  - [ ] `rejectionReason` contains admin's reason
  - [ ] `verificationCompletedAt` has timestamp

## 8. API Endpoint Testing

### Test Doctor Endpoints
```bash
# Get verification status
curl -X GET http://localhost:5000/api/doctors/verification/status \
  -H "Authorization: Bearer <doctor_token>"

# Submit verification
curl -X POST http://localhost:5000/api/doctors/verification/submit \
  -H "Authorization: Bearer <doctor_token>" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

### Test Admin Endpoints
```bash
# Get stats
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer <admin_token>"

# Get pending doctors
curl -X GET http://localhost:5000/api/admin/doctors/pending \
  -H "Authorization: Bearer <admin_token>"

# Get verified doctors
curl -X GET http://localhost:5000/api/admin/doctors/verified \
  -H "Authorization: Bearer <admin_token>"

# Approve doctor
curl -X POST http://localhost:5000/api/admin/doctors/verify/<doctorId> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "verify"}'
```

## 9. Browser Console Check

### Check for Errors
- [ ] Open browser console (F12)
- [ ] Navigate through all pages
- [ ] No console errors appear
- [ ] No 404 errors
- [ ] No CORS errors
- [ ] API calls succeed (200 status)

## 10. TypeScript Compilation

### Check for Type Errors
```bash
cd "ArogyaAI Telemedicine Platform"
npm run build
```
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No type warnings

## Summary Checklist

### Core Functionality
- [ ] Doctor can register and submit verification
- [ ] Admin can view pending verifications
- [ ] Admin can approve doctors
- [ ] Admin can reject doctors with reason
- [ ] Verified doctors appear in patient list
- [ ] Unverified doctors hidden from patients

### User Experience
- [ ] All forms work correctly
- [ ] All buttons work correctly
- [ ] All modals open and close properly
- [ ] Toast notifications appear for all actions
- [ ] Loading states display correctly
- [ ] Error messages are clear and helpful

### Data Integrity
- [ ] All data saves to database correctly
- [ ] Status transitions work correctly
- [ ] Timestamps are recorded
- [ ] Rejection reasons are saved

### Security
- [ ] Role-based access control works
- [ ] Only admins can approve/reject
- [ ] Only doctors can submit verification
- [ ] Only verified doctors visible to patients

### Performance
- [ ] Pages load quickly
- [ ] API calls respond quickly
- [ ] No memory leaks
- [ ] Refresh works smoothly

## Issues Found

Document any issues found during testing:

| Issue | Severity | Description | Status |
|-------|----------|-------------|--------|
|       |          |             |        |

## Test Results

- **Date Tested:** _______________
- **Tested By:** _______________
- **Overall Status:** ⬜ Pass ⬜ Fail ⬜ Partial
- **Notes:** _______________________________________________

## Sign-off

- [ ] All critical tests passed
- [ ] All issues documented
- [ ] System ready for production
- [ ] Documentation complete

**Tester Signature:** _______________
**Date:** _______________
