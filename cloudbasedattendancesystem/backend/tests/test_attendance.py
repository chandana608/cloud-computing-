def get_token(client, email, password="Password@123"):
    res = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    data = res.get_json()
    if "data" not in data:
        # Try student default password
        res = client.post("/api/v1/auth/login", json={"identifier": email, "password": "Student@123"})
        data = res.get_json()
    return data["data"]["token"]

def test_attendance_session_and_marking(client, test_users):
    """End-to-end test of session creation, marking, percentage calculation, and duplicate prevention."""
    admin_token = get_token(client, "admin@test.com", "Password@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create Class
    c_res = client.post("/api/v1/classes", headers=admin_headers, json={
        "name": "B.Tech CSE",
        "section": "A",
        "academic_year": "2026-2027",
        "semester": 5,
        "department": "Computer Science"
    })
    assert c_res.status_code == 201
    class_id = c_res.get_json()["data"]["id"]

    # 2. Create Subject
    s_res = client.post("/api/v1/subjects", headers=admin_headers, json={
        "subject_code": "CS501",
        "subject_name": "Cloud Computing",
        "department": "Computer Science",
        "semester": 5,
        "credits": 4,
        "class_ids": [class_id],
        "faculty_ids": [test_users["faculty"]["faculty_id"]]
    })
    assert s_res.status_code == 201
    subject_id = s_res.get_json()["data"]["id"]

    # 3. Create Student in that class
    st_res = client.post("/api/v1/students", headers=admin_headers, json={
        "full_name": "Aarav Sharma",
        "email": "aarav@test.com",
        "roll_number": "23CS101",
        "class_id": class_id,
        "department": "Computer Science",
        "semester": 5
    })
    assert st_res.status_code == 201
    student_id = st_res.get_json()["data"]["id"]

    # 4. Faculty creates Attendance Session
    fac_token = get_token(client, "faculty@test.com", "Password@123")
    fac_headers = {"Authorization": f"Bearer {fac_token}"}

    sess_res = client.post("/api/v1/attendance/sessions", headers=fac_headers, json={
        "class_id": class_id,
        "subject_id": subject_id,
        "session_date": "2026-10-30",
        "start_time": "10:00",
        "end_time": "11:00",
        "session_type": "Lecture",
        "room": "Room-101"
    })
    assert sess_res.status_code == 201
    session_id = sess_res.get_json()["data"]["id"]

    # 5. Duplicate session prevention
    dup_res = client.post("/api/v1/attendance/sessions", headers=fac_headers, json={
        "class_id": class_id,
        "subject_id": subject_id,
        "session_date": "2026-10-30",
        "start_time": "10:00",
        "end_time": "11:00"
    })
    assert dup_res.status_code == 409

    # 6. Faculty marks attendance (Mark Present)
    mark_res = client.post(f"/api/v1/attendance/sessions/{session_id}/records", headers=fac_headers, json={
        "records": [
            {"student_id": student_id, "status": "Present", "remarks": "On time"}
        ]
    })
    assert mark_res.status_code == 200

    # 7. Finalize Session
    fin_res = client.post(f"/api/v1/attendance/sessions/{session_id}/finalize", headers=fac_headers)
    assert fin_res.status_code == 200

    # 8. Modifying finalized session without reason fails
    mod_fail = client.post(f"/api/v1/attendance/sessions/{session_id}/records", headers=fac_headers, json={
        "records": [
            {"student_id": student_id, "status": "Absent"}
        ]
    })
    assert mod_fail.status_code == 400

    # 9. Student checks their own attendance
    stu_token = get_token(client, "aarav@test.com", "Student@123")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    att_res = client.get(f"/api/v1/students/{student_id}/attendance", headers=stu_headers)
    assert att_res.status_code == 200
    att_data = att_res.get_json()["data"]
    assert att_data["overall"]["percentage"] == 100.0
    assert att_data["overall"]["category"] == "Safe"
