def test_signup(client, supabase_mock):
    supabase_mock.auth.sign_up.return_value = {"user": {"id": "123"}}

    response = client.post("/auth/signup", json={
        "email": "test@example.com",
        "password": "123456"
    })

    assert response.status_code == 200
    assert response.json()["user"]["id"] == "123"
