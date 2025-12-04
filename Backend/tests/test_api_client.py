import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from fastapi.testclient import TestClient
from app.api import app

client = TestClient(app)

@patch("app.api.AsyncResult")
def test_healthcheck(mock_async_result):
    """Test /scan/{job_id}/status endpoint with mocked Celery backend."""
    # Mock the AsyncResult to return a known state without connecting to Redis
    mock_result = MagicMock()
    type(mock_result).state = PropertyMock(return_value="PENDING")
    mock_async_result.return_value = mock_result
    
    response = client.get("/scan/123/status")
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == "123"
    assert data["status"] == "PENDING"
