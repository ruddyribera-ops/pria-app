#!/bin/bash
set -e
echo "=== Running setup_secrets.py ==="
python setup_secrets.py
echo "=== Running seed_db.py ==="
python seed_db.py
echo "=== Starting Streamlit ==="
exec streamlit run app_ui.py --server.port $PORT --server.address 0.0.0.0 --server.headless true
