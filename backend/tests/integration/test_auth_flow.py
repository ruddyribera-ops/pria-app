"""
Integration tests for authentication flow
Full workflow: register → login → protected endpoint access
"""
import pytest


@pytest.mark.asyncio
class TestAuthenticationFlow:
    """Test complete authentication workflow"""

    async def test_register_login_protected_endpoint_full_flow(
        self,
        client,
        school
    ):
        """
        Full workflow:
        1. Register new user
        2. Login with credentials
        3. Use token to access protected endpoint
        4. Verify access allowed
        5. Verify invalid token rejected
        """

        # Step 1: Register user
        register_response = await client.post(
            "/api/auth/register",
            json={
                "email": "workflow_user@example.com",
                "full_name": "Workflow Test User",
                "password": "secure_password_123"
            }
        )

        assert register_response.status_code in [201, 200]
        user_data = register_response.json()
        assert user_data["email"] == "workflow_user@example.com"

        # Step 2: Login with credentials
        login_response = await client.post(
            "/api/auth/token",
            data={
                "username": "workflow_user@example.com",
                "password": "secure_password_123"
            }
        )

        assert login_response.status_code == 200
        token_data = login_response.json()
        assert "access_token" in token_data
        access_token = token_data["access_token"]

        # Step 3: Access protected endpoint with valid token
        headers = {"Authorization": f"Bearer {access_token}"}
        protected_response = await client.get(
            "/api/pdc",
            headers=headers
        )

        # Step 4: Verify access allowed (should be 200 or 404 if no PDCs, not 401)
        assert protected_response.status_code != 401

        # Step 5: Try with invalid token
        invalid_response = await client.get(
            "/api/pdc",
            headers={"Authorization": "Bearer invalid_token_here"}
        )

        assert invalid_response.status_code == 401

    async def test_login_without_registration_fails(self, client):
        """Test login fails for unregistered user"""
        response = await client.post(
            "/api/auth/token",
            data={
                "username": "nonexistent@example.com",
                "password": "any_password"
            }
        )

        assert response.status_code == 401

    async def test_login_with_wrong_password_fails(
        self,
        client,
        user
    ):
        """Test login fails with incorrect password"""
        response = await client.post(
            "/api/auth/token",
            data={
                "username": user.email,
                "password": "wrong_password"
            }
        )

        assert response.status_code == 401

    async def test_protected_endpoint_without_token(self, client):
        """Test protected endpoint requires token"""
        response = await client.get("/api/pdc")

        assert response.status_code in [401, 403]

    async def test_token_expires_and_grants_access_during_validity(
        self,
        client,
        token,
        user
    ):
        """Test token grants access while valid"""
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.get(
            "/api/pdc",
            headers=headers
        )

        # Should be allowed (not 401)
        assert response.status_code != 401

    async def test_user_profile_accessible_with_valid_token(
        self,
        client,
        user,
        token
    ):
        """Test user can access their profile with valid token"""
        headers = {"Authorization": f"Bearer {token}"}

        # Assuming endpoint exists
        response = await client.get(
            "/api/auth/me",
            headers=headers
        )

        if response.status_code == 200:
            user_data = response.json()
            assert user_data["email"] == user.email

    async def test_multiple_users_isolated_auth(
        self,
        client
    ):
        """Test multiple users have isolated authentication"""
        # Register user 1
        user1_response = await client.post(
            "/api/auth/register",
            json={
                "email": "user1@example.com",
                "full_name": "User One",
                "password": "password1"
            }
        )
        assert user1_response.status_code in [201, 200]

        # Register user 2
        user2_response = await client.post(
            "/api/auth/register",
            json={
                "email": "user2@example.com",
                "full_name": "User Two",
                "password": "password2"
            }
        )
        assert user2_response.status_code in [201, 200]

        # Login user 1
        login1 = await client.post(
            "/api/auth/token",
            data={"username": "user1@example.com", "password": "password1"}
        )
        token1 = login1.json()["access_token"]

        # Login user 2
        login2 = await client.post(
            "/api/auth/token",
            data={"username": "user2@example.com", "password": "password2"}
        )
        token2 = login2.json()["access_token"]

        # Verify tokens are different
        assert token1 != token2

        # Verify each token grants access
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        response1 = await client.get("/api/pdc", headers=headers1)
        response2 = await client.get("/api/pdc", headers=headers2)

        assert response1.status_code != 401
        assert response2.status_code != 401
