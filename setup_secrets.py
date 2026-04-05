"""Generates .streamlit/secrets.toml from Railway environment variables at startup."""
import os

keys = os.environ.get("GEMINI_API_KEYS", '[""]')
image_key = os.environ.get("IMAGE_API_KEY", "")
app_password = os.environ.get("APP_PASSWORD", "")
anthropic_key = os.environ.get("ANTHROPIC_API_KEY", '[""]')

toml = f"""GEMINI_API_KEYS = {keys}
ANTHROPIC_API_KEY = {anthropic_key}
IMAGE_API_KEY = "{image_key}"
APP_PASSWORD = "{app_password}"
"""

os.makedirs(".streamlit", exist_ok=True)
with open(".streamlit/secrets.toml", "w") as f:
    f.write(toml)

print("secrets.toml generated OK")
