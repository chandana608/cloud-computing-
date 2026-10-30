# Multi-stage production Dockerfile for Cloud-Based Attendance Management System Backend
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final minimal runtime image
FROM python:3.11-slim

WORKDIR /app

# Copy installed python packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_ENV=production

# Copy application source code
COPY . .

# Expose container application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/v1/health || exit 1

# Production WSGI server command using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "120", "backend.run:app"]
