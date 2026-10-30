def get_token(client, email, password="Password@123"):
    res = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    data = res.get_json()
    if "data" not in data:
        res = client.post("/api/v1/auth/login", json={"identifier": email, "password": "Student@123"})
        data = res.get_json()
    return data["data"]["token"]

def test_correction_request_workflow(client, test_users):
    """Test student submits correction request and faculty approves it."""
    admin_token = get_token(client, "admin@test.com", "Password@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Setup class, subject, student, session, and an Absent record
    c_res = client.post("/api/v1/classes", headers=admin_headers, json={
        "name": "B.Tech CSE", "section": "B", "academic_year": "2026-2027", "semester": 5, "department": "CSE"
    })
    class_id = c_res.get_json()["data"]["id"]

    s_res = client.post("/api/v1/subjects", headers=admin_headers, json={
        "subject_code": "CS502", "subject_name": "DBMS", "department": "CSE", "semester": 5,
        "class_ids": [class_id], "faculty_ids": [test_users["faculty"]["faculty_id"]]
    })
    subject_id = s_res.get_json()["data"]["id"]

    st_res = client.post("/api/v1/students", headers=admin_headers, json={
        "full_name": "Ananya Verma", "email": "ananya@test.com", "roll_number": "23CS201",
        "class_id": class_id, "department": "CSE", "semester": 5
    })
    student_id = st_res.get_json()["data"]["id"]

    fac_token = get_token(client, "faculty@test.com", "Password@123")
    fac_headers = {"Authorization": f"Bearer {fac_token}"}

    sess_res = client.post("/api/v1/attendance/sessions", headers=fac_headers, json={
        "class_id": class_id, "subject_id": subject_id, "session_date": "2026-10-31",
        "start_time": "11:00", "end_time": "12:00"
    })
    session_id = sess_res.get_json()["data"]["id"]

    # Mark as Absent
    client.post(f"/api/v1/attendance/sessions/{session_id}/records", headers=fac_headers, json={
        "records": [{"student_id": student_id, "status": "Absent"}]
    })

    # Student logs in and fetches history to get record ID
    stu_token = get_token(client, "ananya@test.com", "Student@123")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}
    att_res = client.get(f"/api/v1/students/{student_id}/attendance", headers=stu_headers)
    history = att_res.get_json()["data"]["history"]
    record_id = history[0]["record_id"]

    # Student submits correction request
    cr_res = client.post("/api/v1/correction-requests", headers=stu_headers, json={
        "attendance_record_id": record_id,
        "requested_status": "Present",
        "reason": "I was present in class but entered during roll call."
    })
    assert cr_res.status_code == 201
    request_id = cr_res.get_json()["data"]["id"]

    # Faculty reviews and approves request
    rev_res = client.patch(f"/api/v1/correction-requests/{request_id}", headers=fac_headers, json={
        "action": "Approved",
        "reviewer_comments": "Verified presence with classmate. Approved."
    })
    assert rev_res.status_code == 200

    # Verify student attendance status is now Present (100%)
    att_after = client.get(f"/api/v1/students/{student_id}/attendance", headers=stu_headers)
    assert att_after.get_json()["data"]["overall"]["percentage"] == 100.0
