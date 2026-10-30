import json

def test_login_success(client, test_users):
    """Test login with valid email and password."""
    res = client.post("/api/v1/auth/login", json={
        "identifier": "admin@test.com",
        "password": "Password@123"
    })
    data = res.get_json()
    assert res.status_code == 200
    assert data["success"] is True
    assert "token" in data["data"]
    assert data["data"]["user"]["role"] == "admin"

def test_login_invalid_password(client, test_users):
    """Test login with invalid password."""
    res = client.post("/api/v1/auth/login", json={
        "identifier": "admin@test.com",
        "password": "WrongPassword"
    })
    data = res.get_json()
    assert res.status_code == 401
    assert data["success"] is False

def test_login_institution_id(client, test_users):
    """Test login with institution ID instead of email."""
    res = client.post("/api/v1/auth/login", json={
        "identifier": "23cs001",
        "password": "Password@123"
    })
    data = res.get_json()
    assert res.status_code == 200
    assert data["data"]["user"]["role"] == "student"

def test_health_and_readiness(client):
    """Test /health and /ready monitoring endpoints."""
    h_res = client.get("/api/v1/health")
    assert h_res.status_code == 200
    assert h_res.get_json()["status"] == "UP"

    r_res = client.get("/api/v1/ready")
    assert r_res.status_code == 200
    assert r_res.get_json()["ready"] is True
