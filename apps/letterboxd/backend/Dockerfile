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

# NOTE sécurité : USER non-root retiré car incompatible avec les volumes montés depuis l'hôte
# (./data/letterboxd appartient à root sur le serveur, et woob monte /root/.config/woob)
# À réintroduire avec un entrypoint gosu si les permissions des volumes sont corrigées.

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
