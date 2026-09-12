#!/bin/bash
# ==============================================================================
# VicozWorld - Gestionnaire de Certificats mTLS (Mutual TLS)
# Permet de créer l'Autorité de Certification (CA), générer des certificats clients
# (.p12) pour chaque équipement et les expédier par email.
# ==============================================================================

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERTS_DIR="${CERTS_DIR:-$BASE_DIR/data/certs}"
NPM_SSL_DIR="/DATA/AppData/nginx-proxymanager/data/custom_ssl"

# Couleurs d'affichage
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

mkdir -p "$CERTS_DIR"

print_banner() {
    echo -e "${CYAN}======================================================${NC}"
    echo -e "${CYAN}   🔒 VicozWorld - Gestionnaire de Certificats mTLS   ${NC}"
    echo -e "${CYAN}======================================================${NC}"
}

# 1. Initialisation de la CA (Autorité de Certification Racine)
init_ca() {
    print_banner
    if [ -f "$CERTS_DIR/ca.crt" ] && [ -f "$CERTS_DIR/ca.key" ]; then
        echo -e "${YELLOW}ℹ️  L'Autorité de Certification (CA) existe déjà dans : $CERTS_DIR${NC}"
        echo -e "   Fichier public : $CERTS_DIR/ca.crt"
        return 0
    fi

    echo -e "${YELLOW}🔑 Génération de l'Autorité de Certification Racine (CA 4096-bit)...${NC}"
    openssl genrsa -out "$CERTS_DIR/ca.key" 4096
    chmod 600 "$CERTS_DIR/ca.key"

    openssl req -x509 -new -nodes -key "$CERTS_DIR/ca.key" -sha256 -days 3650 \
        -out "$CERTS_DIR/ca.crt" \
        -subj "/C=FR/ST=IDF/O=VicozWorld/OU=Security/CN=VicozWorld-Root-CA"

    echo -e "${GREEN}✅ Autorité de Certification (CA) créée avec succès (valable 10 ans) !${NC}"
    echo -e "   Clé privée maîtresse : $CERTS_DIR/ca.key"
    echo -e "   Certificat public CA  : $CERTS_DIR/ca.crt"

    # Copie automatique vers NPM si présent sur CasaOS
    if [ -d "$NPM_SSL_DIR" ]; then
        echo -e "${CYAN}📋 Copie automatique de ca.crt vers Nginx Proxy Manager ($NPM_SSL_DIR)...${NC}"
        cp "$CERTS_DIR/ca.crt" "$NPM_SSL_DIR/ca.crt"
        chmod 644 "$NPM_SSL_DIR/ca.crt"
        echo -e "${GREEN}✅ Certificat CA déployé pour NPM dans /data/custom_ssl/ca.crt !${NC}"
    fi
}

# 2. Génération d'un certificat client pour un appareil
create_cert() {
    DEVICE="$1"
    PASS="$2"
    EMAIL="$3"

    if [ -z "$DEVICE" ]; then
        echo -e "${RED}❌ Erreur : veuillez spécifier le nom de l'appareil (ex: Victor-iPhone, Claire-MacBook).${NC}"
        echo "Usage: $0 create <nom_appareil> [mot_de_passe] [email_optionnel]"
        exit 1
    fi

    # Nettoyage du nom
    DEVICE=$(echo "$DEVICE" | tr ' ' '-')

    # Vérifier que la CA existe
    if [ ! -f "$CERTS_DIR/ca.crt" ] || [ ! -f "$CERTS_DIR/ca.key" ]; then
        echo -e "${YELLOW}⚠️  L'Autorité de Certification n'est pas encore initialisée. Initialisation automatique...${NC}"
        init_ca
    fi

    DEVICE_DIR="$CERTS_DIR/$DEVICE"
    mkdir -p "$DEVICE_DIR"

    # Mot de passe du conteneur .p12
    if [ -z "$PASS" ]; then
        PASS="VicozWorld2026!"
    fi

    echo -e "${CYAN}🔐 Génération du certificat mTLS pour l'appareil : ${GREEN}$DEVICE${NC}"

    # 1. Clé privée de l'appareil
    openssl genrsa -out "$DEVICE_DIR/$DEVICE.key" 2048
    chmod 600 "$DEVICE_DIR/$DEVICE.key"

    # 2. Demande de signature (CSR) avec le CN = Nom de l'appareil
    openssl req -new -key "$DEVICE_DIR/$DEVICE.key" \
        -out "$DEVICE_DIR/$DEVICE.csr" \
        -subj "/C=FR/O=VicozWorld/CN=$DEVICE"

    # 3. Fichier d'extension pour usage client uniquement
    EXT_FILE="$DEVICE_DIR/$DEVICE.ext"
    cat > "$EXT_FILE" <<EOF
basicConstraints = CA:FALSE
nsCertType = client
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
EOF

    # 4. Signature par la CA (valable 5 ans = 1825 jours)
    openssl x509 -req -in "$DEVICE_DIR/$DEVICE.csr" \
        -CA "$CERTS_DIR/ca.crt" -CAkey "$CERTS_DIR/ca.key" -CAcreateserial \
        -out "$DEVICE_DIR/$DEVICE.crt" -days 1825 -sha256 \
        -extfile "$EXT_FILE"

    # 5. Export au format PKCS#12 (.p12) pour téléphones et ordinateurs
    P12_FILE="$DEVICE_DIR/$DEVICE.p12"
    openssl pkcs12 -export -out "$P12_FILE" \
        -inkey "$DEVICE_DIR/$DEVICE.key" \
        -in "$DEVICE_DIR/$DEVICE.crt" \
        -certfile "$CERTS_DIR/ca.crt" \
        -name "$DEVICE" \
        -passout "pass:$PASS"

    rm -f "$EXT_FILE" "$DEVICE_DIR/$DEVICE.csr"

    echo ""
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}🎉 CERTIFICAT CLIENT CRÉÉ AVEC SUCCÈS POUR : $DEVICE${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo -e "📁 Fichier généré : ${CYAN}$P12_FILE${NC}"
    echo -e "🔑 Mot de passe du fichier : ${YELLOW}$PASS${NC}"
    echo ""
    echo -e "${YELLOW}📲 INSTRUCTIONS D'INSTALLATION :${NC}"
    echo -e "   • ${CYAN}Sur iPhone / iPad${NC} : Envoyez le fichier par AirDrop ou Mail. Cliquez dessus,"
    echo -e "     puis allez dans Réglages > Profil téléchargé > Installer (tapez le code PIN iPhone)."
    echo -e "   • ${CYAN}Sur Windows / Mac${NC} : Double-cliquez sur le fichier $DEVICE.p12, entrez le mot de passe,"
    echo -e "     et laissez l'assistant l'enregistrer dans le magasin personnel."
    echo -e "   • ${CYAN}Sur Android${NC} : Paramètres > Sécurité > Chiffrement > Installer un certificat (VPN & appli)."
    echo ""

    # 6. Envoi par email si demandé
    if [ -n "$EMAIL" ]; then
        echo -e "${CYAN}📧 Envoi du certificat par email à : $EMAIL...${NC}"
        python3 - <<PYEOF
import smtplib
import os
from email.message import EmailMessage

p12_path = "$P12_FILE"
device = "$DEVICE"
recipient = "$EMAIL"
password_hint = "$PASS"

sender = os.getenv("GMAIL_EMAIL", "")
sender_password = os.getenv("GMAIL_PASSWORD", "")

if not sender or not sender_password:
    print("⚠️ Identifiants GMAIL_EMAIL ou GMAIL_PASSWORD non définis en variable d'environnement.")
    print("   L'email n'a pas pu être envoyé automatiquement, veuillez transférer le fichier manuellement.")
else:
    try:
        msg = EmailMessage()
        msg['Subject'] = f"🔒 Votre Certificat de Sécurité VicozWorld ({device})"
        msg['From'] = sender
        msg['To'] = recipient
        msg.set_content(f"""Bonjour,

Voici votre certificat de sécurité personnel pour vous connecter à VicozWorld.

📱 Appareil : {device}
🔑 Mot de passe de déverrouillage : {password_hint}

Pour l'installer :
1. Téléchargez le fichier joint ({device}.p12).
2. Cliquez dessus pour lancer l'installation sur votre appareil.
3. Entrez le mot de passe indiqué ci-dessus.

Une fois installé, vous pourrez accéder en toute sécurité à https://vw.vicopetit.dedyn.io/ !
""")
        with open(p12_path, 'rb') as f:
            file_data = f.read()
            file_name = os.path.basename(p12_path)
            msg.add_attachment(file_data, maintype='application', subtype='x-pkcs12', filename=file_name)

        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(sender, sender_password)
            server.send_message(msg)
        print("✅ Email envoyé avec succès avec le fichier .p12 en pièce jointe !")
    except Exception as e:
        print(f"❌ Erreur lors de l'envoi de l'email : {e}")
PYEOF
    fi
}

# 3. Liste de tous les certificats générés
list_certs() {
    print_banner
    echo -e "${YELLOW}📋 Appareils certifiés VicozWorld :${NC}"
    echo ""
    found=0
    for d in "$CERTS_DIR"/*; do
        if [ -d "$d" ]; then
            dev_name=$(basename "$d")
            crt_file="$d/$dev_name.crt"
            p12_file="$d/$dev_name.p12"
            if [ -f "$crt_file" ]; then
                found=1
                end_date=$(openssl x509 -enddate -noout -in "$crt_file" | cut -d= -f2)
                echo -e " • ${GREEN}$dev_name${NC} (Expire le: $end_date) -> Fichier: $p12_file"
            fi
        fi
    done
    if [ $found -eq 0 ]; then
        echo "Aucun certificat client créé pour le moment."
    fi
    echo ""
}

# 4. Synchroniser ca.crt vers NPM
sync_npm() {
    print_banner
    if [ ! -f "$CERTS_DIR/ca.crt" ]; then
        echo -e "${RED}❌ Le certificat ca.crt n'existe pas encore. Lancez d'abord : $0 init${NC}"
        exit 1
    fi
    mkdir -p "$NPM_SSL_DIR"
    cp "$CERTS_DIR/ca.crt" "$NPM_SSL_DIR/ca.crt"
    chmod 644 "$NPM_SSL_DIR/ca.crt"
    echo -e "${GREEN}✅ ca.crt copié avec succès vers $NPM_SSL_DIR/ca.crt !${NC}"
}

# Routage des commandes
case "$1" in
    init)
        init_ca
        ;;
    create)
        create_cert "$2" "$3" "$4"
        ;;
    list)
        list_certs
        ;;
    sync-npm)
        sync_npm
        ;;
    *)
        print_banner
        echo "Commandes disponibles :"
        echo "  $0 init                                    Initialiser la CA maîtresse"
        echo "  $0 create <Nom-Appareil> [mdp] [email]     Créer un certificat client .p12"
        echo "  $0 list                                    Lister les certificats créés"
        echo "  $0 sync-npm                                Copier ca.crt vers NPM"
        echo ""
        echo "Exemples :"
        echo "  $0 create Victor-iPhone"
        echo "  $0 create Claire-iPad MonSuperMotDePasse claire@gmail.com"
        exit 1
        ;;
esac
