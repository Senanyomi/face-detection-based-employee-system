FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project (all services + shared module)
COPY . .

# PYTHONPATH ensures `shared` is importable from every service
ENV PYTHONPATH=/app

# Default command (overridden per-service in docker-compose.yml and Render)
CMD ["uvicorn", "auth_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
