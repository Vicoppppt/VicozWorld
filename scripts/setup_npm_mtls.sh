#!/bin/bash
# ==============================================================================
# Configure Nginx Proxy Manager to forward mTLS client certificate headers
# ==============================================================================

NPM_CONTAINER="${1:-nginxproxymanager}"

echo "🔧 Configuration de Nginx Proxy Manager ($NPM_CONTAINER) pour le mTLS..."

if ! sudo docker ps --format '{{.Names}}' | grep -q "^${NPM_CONTAINER}$"; then
    echo "❌ Conteneur $NPM_CONTAINER introuvable ou arrêté."
    exit 1
fi

sudo docker exec -i "$NPM_CONTAINER" sh -c 'cat << "EOF" > /etc/nginx/conf.d/include/proxy.conf
add_header       X-Served-By $host;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Scheme $scheme;
proxy_set_header X-Forwarded-Proto  $scheme;
proxy_set_header X-Forwarded-For    $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP          $remote_addr;
proxy_set_header X-Client-Cert-Status $ssl_client_verify;
proxy_set_header X-Client-Cert-DN     $ssl_client_s_dn;
proxy_set_header X-Client-Cert-Serial $ssl_client_serial;
proxy_pass       $forward_scheme://$server:$port$request_uri;
EOF'

sudo docker exec -i "$NPM_CONTAINER" nginx -t
sudo docker exec -i "$NPM_CONTAINER" nginx -s reload

echo "✅ Nginx Proxy Manager configuré et rechargé avec succès !"
