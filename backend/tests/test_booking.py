def test_create_booking(client):
    payload = {
        "pickup": "A",
        "drop": "B",
        "user_id": 1
    }

    response = client.post("/booking/create", json=payload)

    assert response.status_code == 200
    assert response.json()["pickup"] == "A"
