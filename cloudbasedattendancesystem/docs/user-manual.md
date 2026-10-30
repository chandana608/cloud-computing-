# User Manual: Cloud-Based Attendance Management System

This manual provides role-specific guidance for Administrators, Faculty Members, and Students using the web application.

---

## 1. Administrator Guide

### Dashboard
- Inspect institutional metrics: Active Students, Faculty Members, Total Sessions Conducted, and Overall Attendance Rate.
- Review the **Attendance Distribution Chart** categorizing students into Safe (>=80%), Warning (75-79%), and Defaulter (<75%).
- View the Recent Sessions feed and pending correction request alert box.

### Academic Operations
1. **Students**: Navigate to **Students** to view or search records. Click **Add New Student** to register a student; they are automatically enrolled into the subjects mapped to their class.
2. **Faculty**: Navigate to **Faculty** to add faculty instructors and allocate subject teaching assignments.
3. **Classes & Sections**: Create departments, degree programs, semesters, and sections.
4. **Curriculum Subjects**: Manage course codes, credits, and links to faculty.
5. **Reports & Defaulters**: Adjust the policy threshold slider (default 75%) and click **Export CSV** or **Export PDF** for official institutional documentation.
6. **Audit Logs**: View an immutable log of logins, register overrides, and account modifications.

---

## 2. Faculty Guide

### Conducting an Attendance Session
1. Click **New Session** from the dashboard or sidebar.
2. Select your assigned Class and Subject.
3. Confirm Session Date, Start/End Time, Session Type (Lecture, Lab), and Classroom.
4. Click **Open Session & Take Attendance**.
5. You are brought directly to the **Interactive Roster**:
   - Use **Mark All Present** to quickly set attendance.
   - Click individual buttons (**Present**, **Absent**, **Late**, **Excused**) to record exceptions.
   - Add optional remarks for late or excused students.
   - Click **Save Records** to push to the cloud database.
   - When finished, click **Finalize Session** to lock the register.
6. If modifying a finalized session later, enter a mandatory justification reason to update the audit log.

### Reviewing Correction Requests
- Under **Correction Review**, examine student claims for missed attendance or medical leaves. Click **Approve** or **Reject** with reviewer notes.

---

## 3. Student Guide

### Dashboard & Metrics
- The **Overall Percentage Gauge** indicates whether you are Safe (Green), Caution/Warning (Amber), or Defaulter (Red).
- Review individual **Enrolled Subject Cards** to see attended vs. eligible class counts.

### Requesting Attendance Corrections
1. Navigate to **My Attendance**.
2. Locate the session marked **Absent** or **Late**.
3. Click **Request Fix**.
4. Choose requested status (`Present` or `Excused`) and provide a descriptive reason (e.g. medical appointment or roll call error).
5. Track status under **Correction History** until approved or rejected by your instructor.
