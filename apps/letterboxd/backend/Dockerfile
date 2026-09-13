FROM python:3.11-slim

WORKDIR /app

# System dependencies for woob / python
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    git \
    libxml2-dev \
    libxslt-dev \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV DATA_DIR=/app/data
RUN mkdir -p /app/data

# 🔒 Sécurité : ne pas tourner en root dans le container
RUN addgroup --system appgroup && adduser --system --ingroup appgroup --no-create-home appuser
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
