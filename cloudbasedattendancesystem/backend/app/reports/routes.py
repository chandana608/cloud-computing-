from datetime import datetime, timezone
from flask import Blueprint, request, send_file, current_app
from backend.app.common.database import Database, serialize_doc, to_object_id
from backend.app.common.errors import APIError, success_response
from backend.app.common.decorators import roles_required, get_current_user_doc
from backend.app.common.attendance_calculator import compute_attendance_percentage
from backend.app.reports.export_service import generate_csv_report, generate_pdf_report

reports_bp = Blueprint("reports", __name__, url_prefix="/api/v1/reports")

@reports_bp.route("/dashboard-stats", methods=["GET"])
@roles_required("admin", "faculty")
def get_dashboard_stats():
    """Returns aggregated high-level KPIs for institution and faculty dashboards."""
    db = Database.get_db()
    current_user = get_current_user_doc()
    role = current_user["role"]

    if role == "admin":
        total_students = db.students.count_documents({})
        total_faculty = db.faculty.count_documents({})
        total_classes = db.classes.count_documents({})
        total_subjects = db.subjects.count_documents({})
        total_sessions = db.attendance_sessions.count_documents({})

        # Today's sessions
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_sessions = list(db.attendance_sessions.find({"session_date": today_str}))
        today_sessions_count = len(today_sessions)

        # Pending correction requests
        pending_corrections = db.correction_requests.count_documents({"status": "Pending"})

        # Calculate overall institutional attendance rate
        total_records = db.attendance_records.count_documents({})
        total_present = db.attendance_records.count_documents({"status": "Present"})
        total_late = db.attendance_records.count_documents({"status": "Late"})
        total_excused = db.attendance_records.count_documents({"status": "Excused"})
        avg_pct, _, _, cat = compute_attendance_percentage(total_present, total_late, total_excused, total_records)

        # Recent 5 sessions
        recent_sessions = list(db.attendance_sessions.find().sort("created_at", -1).limit(5))
        enriched_recent = []
        for s in recent_sessions:
            sub = db.subjects.find_one({"_id": s.get("subject_id")})
            cls = db.classes.find_one({"_id": s.get("class_id")})
            ser = serialize_doc(s)
            ser["subject_name"] = sub.get("subject_name", "") if sub else ""
            ser["class_name"] = f"{cls.get('name', '')} ({cls.get('section', '')})" if cls else ""
            enriched_recent.append(ser)

        return success_response(data={
            "total_students": total_students,
            "total_faculty": total_faculty,
            "total_classes": total_classes,
            "total_subjects": total_subjects,
            "total_sessions": total_sessions,
            "today_sessions_count": today_sessions_count,
            "pending_corrections": pending_corrections,
            "institutional_average": avg_pct,
            "institutional_category": cat,
            "recent_sessions": enriched_recent
        })

    elif role == "faculty":
        fac_doc = db.faculty.find_one({"user_id": current_user["_id"]})
        if not fac_doc:
            raise APIError("Faculty record not found.", status_code=404)

        fac_id = fac_doc["_id"]
        assigned_subjects_count = len(fac_doc.get("assigned_subject_ids", []))
        assigned_classes_count = len(fac_doc.get("assigned_class_ids", []))
        my_sessions_count = db.attendance_sessions.count_documents({"faculty_id": fac_id})

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        today_sessions = list(db.attendance_sessions.find({"faculty_id": fac_id, "session_date": today_str}))

        # Open sessions waiting to be marked/finalized
        open_sessions = list(db.attendance_sessions.find({"faculty_id": fac_id, "status": "Open"}))

        return success_response(data={
            "assigned_subjects_count": assigned_subjects_count,
            "assigned_classes_count": assigned_classes_count,
            "total_sessions_conducted": my_sessions_count,
            "today_sessions_count": len(today_sessions),
            "open_sessions_count": len(open_sessions)
        })

@reports_bp.route("/daily", methods=["GET"])
@roles_required("admin", "faculty")
def get_daily_report():
    """Returns attendance summary grouped by session for a specific date."""
    db = Database.get_db()
    date_str = request.args.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d"))

    query = {"session_date": date_str}
    class_id = request.args.get("class_id")
    if class_id:
        c_oid = to_object_id(class_id)
        if c_oid:
            query["class_id"] = c_oid

    sessions = list(db.attendance_sessions.find(query).sort("start_time", 1))

    report_data = []
    for s in sessions:
        sub = db.subjects.find_one({"_id": s.get("subject_id")})
        cls = db.classes.find_one({"_id": s.get("class_id")})
        fac = db.faculty.find_one({"_id": s.get("faculty_id")})
        u_fac = db.users.find_one({"_id": fac["user_id"]}) if fac else None

        records = list(db.attendance_records.find({"session_id": s["_id"]}))
        present = sum(1 for r in records if r["status"] == "Present")
        absent = sum(1 for r in records if r["status"] == "Absent")
        late = sum(1 for r in records if r["status"] == "Late")
        excused = sum(1 for r in records if r["status"] == "Excused")
        total = len(records)

        pct, _, _, cat = compute_attendance_percentage(present, late, excused, total)

        report_data.append({
            "session_id": str(s["_id"]),
            "session_date": s.get("session_date"),
            "start_time": s.get("start_time"),
            "end_time": s.get("end_time"),
            "class_name": f"{cls.get('name')} ({cls.get('section')})" if cls else "N/A",
            "subject_name": sub.get("subject_name") if sub else "N/A",
            "subject_code": sub.get("subject_code") if sub else "N/A",
            "faculty_name": u_fac.get("full_name") if u_fac else "N/A",
            "session_type": s.get("session_type", "Lecture"),
            "status": s.get("status"),
            "total_marked": total,
            "present": present,
            "absent": absent,
            "late": late,
            "excused": excused,
            "percentage": pct,
            "category": cat
        })

    return success_response(data=report_data)

@reports_bp.route("/subject-wise", methods=["GET"])
@roles_required("admin", "faculty")
def get_subject_wise_report():
    """Returns student-by-student attendance for a selected class and subject."""
    db = Database.get_db()
    class_id = request.args.get("class_id")
    subject_id = request.args.get("subject_id")

    if not class_id or not subject_id:
        raise APIError("Both 'class_id' and 'subject_id' are required query parameters.", status_code=400)

    c_oid = to_object_id(class_id)
    s_oid = to_object_id(subject_id)
    if not c_oid or not s_oid:
        raise APIError("Invalid class ID or subject ID.", status_code=400)

    cls_doc = db.classes.find_one({"_id": c_oid})
    sub_doc = db.subjects.find_one({"_id": s_oid})

    # Fetch all sessions for this subject & class
    sessions = list(db.attendance_sessions.find({"class_id": c_oid, "subject_id": s_oid}))
    session_ids = [s["_id"] for s in sessions]
    total_conducted = len(sessions)

    # Fetch students enrolled in this class
    students = list(db.students.find({"class_id": c_oid}).sort("roll_number", 1))

    # All attendance records for these sessions
    all_records = list(db.attendance_records.find({"session_id": {"$in": session_ids}}))

    # Group records by student
    student_records_map = {}
    for r in all_records:
        st_id = r["student_id"]
        if st_id not in student_records_map:
            student_records_map[st_id] = []
        student_records_map[st_id].append(r)

    rows = []
    min_threshold = current_app.config.get("MIN_ATTENDANCE_PERCENTAGE", 75.0)

    for st in students:
        u_doc = db.users.find_one({"_id": st["user_id"]})
        recs = student_records_map.get(st["_id"], [])

        present = sum(1 for r in recs if r["status"] == "Present")
        late = sum(1 for r in recs if r["status"] == "Late")
        excused = sum(1 for r in recs if r["status"] == "Excused")
        absent = sum(1 for r in recs if r["status"] == "Absent")

        pct, eligible, attended, cat = compute_attendance_percentage(
            present, late, excused, total_conducted
        )

        rows.append({
            "student_id": str(st["_id"]),
            "roll_number": st.get("roll_number"),
            "full_name": u_doc.get("full_name") if u_doc else "Unknown",
            "email": u_doc.get("email") if u_doc else "",
            "total_sessions": total_conducted,
            "eligible_sessions": eligible,
            "attended_sessions": attended,
            "present": present,
            "late": late,
            "excused": excused,
            "absent": absent,
            "percentage": pct,
            "category": cat,
            "is_defaulter": pct is not None and pct < min_threshold
        })

    return success_response(data={
        "class_name": f"{cls_doc.get('name')} ({cls_doc.get('section')})" if cls_doc else "N/A",
        "subject_name": sub_doc.get("subject_name") if sub_doc else "N/A",
        "subject_code": sub_doc.get("subject_code") if sub_doc else "N/A",
        "total_sessions_conducted": total_conducted,
        "students": rows
    })

@reports_bp.route("/defaulters", methods=["GET"])
@roles_required("admin", "faculty")
def get_defaulters_report():
    """Identifies all students falling below the institutional attendance threshold."""
    db = Database.get_db()
    min_threshold = float(request.args.get("threshold", current_app.config.get("MIN_ATTENDANCE_PERCENTAGE", 75.0)))
    class_id = request.args.get("class_id")

    query = {}
    if class_id:
        c_oid = to_object_id(class_id)
        if c_oid:
            query["class_id"] = c_oid

    students = list(db.students.find(query).sort("roll_number", 1))
    defaulters = []

    for st in students:
        u_doc = db.users.find_one({"_id": st["user_id"]})
        cls_doc = db.classes.find_one({"_id": st.get("class_id")})

        # Calculate student's overall attendance
        records = list(db.attendance_records.find({"student_id": st["_id"]}))
        total = len(records)
        if total == 0:
            continue

        present = sum(1 for r in records if r["status"] == "Present")
        late = sum(1 for r in records if r["status"] == "Late")
        excused = sum(1 for r in records if r["status"] == "Excused")
        absent = sum(1 for r in records if r["status"] == "Absent")

        pct, eligible, attended, cat = compute_attendance_percentage(present, late, excused, total)

        if pct is not None and pct < min_threshold:
            defaulters.append({
                "student_id": str(st["_id"]),
                "roll_number": st.get("roll_number"),
                "full_name": u_doc.get("full_name") if u_doc else "Unknown",
                "email": u_doc.get("email") if u_doc else "",
                "class_name": f"{cls_doc.get('name')} ({cls_doc.get('section')})" if cls_doc else "N/A",
                "department": st.get("department"),
                "eligible_sessions": eligible,
                "attended_sessions": attended,
                "missed_sessions": absent,
                "percentage": pct,
                "threshold": min_threshold
            })

    return success_response(data={
        "threshold_used": min_threshold,
        "defaulters_count": len(defaulters),
        "defaulters": defaulters
    })

@reports_bp.route("/export/csv", methods=["GET"])
@roles_required("admin", "faculty")
def export_csv():
    """Exports attendance report as CSV."""
    report_type = request.args.get("type", "defaulters")
    db = Database.get_db()

    if report_type == "defaulters":
        min_threshold = float(request.args.get("threshold", current_app.config.get("MIN_ATTENDANCE_PERCENTAGE", 75.0)))
        class_id = request.args.get("class_id")
        query = {}
        if class_id:
            c_oid = to_object_id(class_id)
            if c_oid:
                query["class_id"] = c_oid

        students = list(db.students.find(query).sort("roll_number", 1))
        headers = ["Roll Number", "Full Name", "Email", "Class", "Department", "Eligible Sessions", "Attended", "Missed", "Percentage (%)", "Status"]
        rows = []

        for st in students:
            u_doc = db.users.find_one({"_id": st["user_id"]})
            cls_doc = db.classes.find_one({"_id": st.get("class_id")})
            recs = list(db.attendance_records.find({"student_id": st["_id"]}))
            if not recs:
                continue
            pres = sum(1 for r in recs if r["status"] == "Present")
            lt = sum(1 for r in recs if r["status"] == "Late")
            exc = sum(1 for r in recs if r["status"] == "Excused")
            pct, el, att, cat = compute_attendance_percentage(pres, lt, exc, len(recs))

            if pct is not None and pct < min_threshold:
                rows.append([
                    st.get("roll_number"),
                    u_doc.get("full_name") if u_doc else "",
                    u_doc.get("email") if u_doc else "",
                    f"{cls_doc.get('name')} ({cls_doc.get('section')})" if cls_doc else "",
                    st.get("department", ""),
                    el,
                    att,
                    len(recs) - att,
                    f"{pct}%",
                    "Defaulter"
                ])

        csv_buffer = generate_csv_report(headers, rows)
        return send_file(
            csv_buffer,
            mimetype="text/csv",
            as_attachment=True,
            download_name=f"defaulters_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
        )
    else:
        # Default generic attendance records export
        headers = ["Date", "Roll Number", "Status", "Remarks"]
        rows = []
        records = list(db.attendance_records.find().limit(200))
        for r in records:
            st = db.students.find_one({"_id": r["student_id"]})
            sess = db.attendance_sessions.find_one({"_id": r["session_id"]})
            rows.append([
                sess.get("session_date") if sess else "",
                st.get("roll_number") if st else "",
                r.get("status"),
                r.get("remarks", "")
            ])
        csv_buffer = generate_csv_report(headers, rows)
        return send_file(
            csv_buffer,
            mimetype="text/csv",
            as_attachment=True,
            download_name="attendance_records.csv"
        )

@reports_bp.route("/export/pdf", methods=["GET"])
@roles_required("admin", "faculty")
def export_pdf():
    """Exports attendance report as PDF using ReportLab."""
    report_type = request.args.get("type", "defaulters")
    db = Database.get_db()
    institution = current_app.config.get("INSTITUTION_NAME", "Cloud Attendance Institute")

    if report_type == "defaulters":
        min_threshold = float(request.args.get("threshold", current_app.config.get("MIN_ATTENDANCE_PERCENTAGE", 75.0)))
        students = list(db.students.find().sort("roll_number", 1))
        headers = ["Roll No", "Student Name", "Class", "Attended", "Eligible", "Percentage", "Status"]
        rows = []

        for st in students:
            u_doc = db.users.find_one({"_id": st["user_id"]})
            cls_doc = db.classes.find_one({"_id": st.get("class_id")})
            recs = list(db.attendance_records.find({"student_id": st["_id"]}))
            if not recs:
                continue
            pres = sum(1 for r in recs if r["status"] == "Present")
            lt = sum(1 for r in recs if r["status"] == "Late")
            exc = sum(1 for r in recs if r["status"] == "Excused")
            pct, el, att, _ = compute_attendance_percentage(pres, lt, exc, len(recs))

            if pct is not None and pct < min_threshold:
                rows.append([
                    st.get("roll_number"),
                    u_doc.get("full_name", "")[:18] if u_doc else "",
                    f"{cls_doc.get('name', '')}-{cls_doc.get('section', '')}" if cls_doc else "",
                    str(att),
                    str(el),
                    f"{pct}%",
                    "Defaulter"
                ])

        pdf_buffer = generate_pdf_report(
            title=f"{institution} - Defaulter Report",
            subtitle=f"Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y')} | Threshold: < {min_threshold}%",
            headers=headers,
            rows=rows,
            filename="defaulters_report.pdf"
        )

        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"defaulter_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
        )
    else:
        # Generic daily session PDF
        headers = ["Date", "Class", "Subject", "Status"]
        rows = []
        sessions = list(db.attendance_sessions.find().sort("session_date", -1).limit(20))
        for s in sessions:
            cls = db.classes.find_one({"_id": s.get("class_id")})
            sub = db.subjects.find_one({"_id": s.get("subject_id")})
            rows.append([
                s.get("session_date", ""),
                f"{cls.get('name', '')}-{cls.get('section', '')}" if cls else "",
                sub.get("subject_code", "") if sub else "",
                s.get("status", "")
            ])

        pdf_buffer = generate_pdf_report(
            title=f"{institution} - Attendance Sessions Report",
            subtitle=f"Generated on {datetime.now(timezone.utc).strftime('%B %d, %Y')}",
            headers=headers,
            rows=rows,
            filename="sessions_report.pdf"
        )

        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name="sessions_report.pdf"
        )
