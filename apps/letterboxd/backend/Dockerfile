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
ENV HOME=/home/vicoz

# Création du dossier data et de l'utilisateur non-root vicoz (ID 1000)
RUN mkdir -p /app/data && \
    groupadd -g 1000 vicoz && \
    useradd -u 1000 -g 1000 -d /home/vicoz -s /bin/bash vicoz && \
    mkdir -p /home/vicoz/.config/woob /home/vicoz/.local/share/woob && \
    chown -R vicoz:vicoz /app /home/vicoz

USER 1000:1000

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
