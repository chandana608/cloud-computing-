def get_token(client, email, password="Password@123"):
    res = client.post("/api/v1/auth/login", json={"identifier": email, "password": password})
    return res.get_json()["data"]["token"]

def test_admin_create_class(client, test_users):
    """Test admin creates an academic class."""
    token = get_token(client, "admin@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/v1/classes", headers=headers, json={
        "name": "B.Tech Computer Science",
        "section": "A",
        "academic_year": "2026-2027",
        "semester": 5,
        "department": "Computer Science"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert data["data"]["name"] == "B.Tech Computer Science"

def test_faculty_forbidden_create_class(client, test_users):
    """Test faculty cannot create classes."""
    token = get_token(client, "faculty@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/v1/classes", headers=headers, json={
        "name": "Unauthorized Class",
        "section": "A",
        "academic_year": "2026-2027",
        "semester": 5,
        "department": "Computer Science"
    })
    assert res.status_code == 403

def test_admin_create_subject(client, test_users):
    """Test subject creation and duplication prevention."""
    token = get_token(client, "admin@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/api/v1/subjects", headers=headers, json={
        "subject_code": "CS501",
        "subject_name": "Cloud Computing",
        "department": "Computer Science",
        "semester": 5,
        "credits": 4
    })
    assert res.status_code == 201

    # Attempt duplicate subject code
    dup = client.post("/api/v1/subjects", headers=headers, json={
        "subject_code": "CS501",
        "subject_name": "Duplicate Subject",
        "department": "Computer Science",
        "semester": 5
    })
    assert dup.status_code == 400
