import os
import sys
import argparse
import imaplib
import email
import re
from email.header import decode_header
from datetime import datetime

# Chargement optionnel de python-dotenv et rich pour une meilleure expérience UI
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

try:
    from rich.console import Console
    from rich.table import Table
    from rich.prompt import Confirm, Prompt
    from rich.progress import Progress
    console = Console()
    HAS_RICH = True
except ImportError:
    HAS_RICH = False
    console = None


def print_info(text: str):
    if HAS_RICH and console:
        console.print(f"[bold blue][INFO][/bold blue] {text}")
    else:
        print(f"[INFO] {text}")


def print_success(text: str):
    if HAS_RICH and console:
        console.print(f"[bold green][SUCCÈS][/bold green] {text}")
    else:
        print(f"[SUCCÈS] {text}")


def print_warning(text: str):
    if HAS_RICH and console:
        console.print(f"[bold yellow][ATTENTION][/bold yellow] {text}")
    else:
        print(f"[ATTENTION] {text}")


def print_error(text: str):
    if HAS_RICH and console:
        console.print(f"[bold red][ERREUR][/bold red] {text}")
    else:
        print(f"[ERREUR] {text}")


def decode_mime_words(header_value: str) -> str:
    """Décode les entêtes MIME RFC 2047 (ex: sujet avec accents ou encodé UTF-8/ISO-8859-1)."""
    if not header_value:
        return "(Sans sujet)"
    decoded_fragments = []
    for fragment, encoding in decode_header(header_value):
        if isinstance(fragment, bytes):
            try:
                decoded_fragments.append(fragment.decode(encoding or "utf-8", errors="replace"))
            except (UnicodeDecodeError, LookupError):
                decoded_fragments.append(fragment.decode("latin-1", errors="replace"))
        else:
            decoded_fragments.append(str(fragment))
    return "".join(decoded_fragments)


class GmailManager:
    IMAP_SERVER = "imap.gmail.com"
    IMAP_PORT = 993

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.client = None
        self.trash_folder = None

    def connect(self, silent: bool = False):
        """Se connecte au serveur IMAP SSL de Gmail et s'authentifie."""
        if not silent:
            print_info(f"Connexion à {self.IMAP_SERVER}:{self.IMAP_PORT} pour {self.username}...")
        try:
            if self.client:
                try:
                    self.client.logout()
                except Exception:
                    pass
            self.client = imaplib.IMAP4_SSL(self.IMAP_SERVER, self.IMAP_PORT)
            self.client.login(self.username, self.password)
            if not silent:
                print_success("Connexion IMAP réussie !")
            self._detect_trash_folder(silent=silent)
        except imaplib.IMAP4.error as e:
            print_error(f"Échec de l'authentification Gmail IMAP : {e}")
            raise RuntimeError(f"Échec authentification Gmail : {e}")
        except Exception as e:
            print_error(f"Erreur de connexion : {e}")
            raise RuntimeError(f"Erreur de connexion IMAP : {e}")

    def ensure_connected(self):
        """Vérifie la validité de la session IMAP et reconnecte automatiquement si nécessaire."""
        try:
            if self.client and getattr(self.client, 'state', None) in ['AUTH', 'SELECTED']:
                status, _ = self.client.noop()
                if status == "OK":
                    return
        except Exception:
            pass
        self.connect(silent=True)

    def disconnect(self):
        """Ferme proprement la session IMAP."""
        if self.client:
            try:
                self.client.logout()
            except Exception:
                pass
            self.client = None

    def _detect_trash_folder(self, silent: bool = False):
        """Détecte le nom exact du dossier Corbeille (Trash) dans Gmail (ex: [Gmail]/Corbeille ou [Gmail]/Trash)."""
        try:
            status, folder_list = self.client.list()
            if status == "OK" and folder_list:
                for folder_raw in folder_list:
                    folder_str = folder_raw.decode("utf-8", errors="replace")
                    if "\\Trash" in folder_str:
                        parts = folder_str.split(' "/" ')
                        if len(parts) >= 2:
                            self.trash_folder = parts[1].strip().strip('"')
                            break
        except Exception:
            pass
        if not self.trash_folder:
            self.trash_folder = "[Gmail]/Corbeille"
        if not silent:
            print_info(f"Dossier Corbeille détecté : '{self.trash_folder}'")

    def search_emails(self, query: str, folder: str = "INBOX") -> list:
        """
        Recherche des e-mails correspondant à une requête Gmail (ex: from:HelloWork).
        Retourne une liste de UIDs (les plus récents en premier).
        """
        clean_query = query.strip() if query else ""
        print_info(f"Recherche dans '{folder}' avec le filtre : '{clean_query}'...")

        for attempt in range(2):
            try:
                self.ensure_connected()
                self.client.select(f'"{folder}"')

                # Si la requête demande tous les e-mails ou la boîte de réception
                if not clean_query or clean_query.upper() in ["ALL", "INBOX", "ALL MAILS", "*"]:
                    status, data = self.client.uid('search', None, 'ALL')
                else:
                    status, data = self.client.uid('search', None, 'X-GM-RAW', f'"{clean_query}"')
                    if status != "OK":
                        status, data = self.client.uid('search', None, f'FROM "{clean_query}"')

                if status == "OK" and data and data[0]:
                    uids = data[0].split()
                    return list(reversed(uids))
                return []
            except (imaplib.IMAP4.abort, imaplib.IMAP4.error, BrokenPipeError, ConnectionResetError, OSError) as e:
                self.connect(silent=True)
            except Exception as e:
                print_error(f"Erreur recherche : {e}")
                return []
        return []

    def fetch_email_summaries(self, uids: list, limit: int = 0) -> list:
        """Récupère les entêtes (Expéditeur, Sujet, Date) pour la liste d'UIDs donnée de façon ultra-rapide par lot."""
        if not uids:
            return []

        target_uids = uids[:limit] if limit > 0 else uids
        clean_uids = []
        for u in target_uids:
            u_str = u.decode("utf-8") if isinstance(u, bytes) else str(u).strip()
            if u_str.isdigit():
                clean_uids.append(u_str)

        if not clean_uids:
            return []

        summaries = []
        batch_size = 50

        for i in range(0, len(clean_uids), batch_size):
            batch = clean_uids[i:i + batch_size]
            uid_csv = b",".join(b.encode("utf-8") for b in batch)
            try:
                self.ensure_connected()
                res, data = self.client.uid('fetch', uid_csv, '(BODY.PEEK[HEADER.FIELDS (SUBJECT FROM DATE)])')
                if res == 'OK' and data:
                    for item in data:
                        if isinstance(item, tuple) and len(item) == 2:
                            meta_str = item[0].decode('utf-8', errors='replace')
                            uid_match = re.search(r'UID\s+(\d+)', meta_str)
                            uid_val = uid_match.group(1) if uid_match else ''
                            
                            try:
                                msg = email.message_from_bytes(item[1])
                                subject = decode_mime_words(msg.get("Subject", "(Sans sujet)"))
                                sender = decode_mime_words(msg.get("From", "(Expéditeur inconnu)"))
                                date_str = msg.get("Date", "")
                                
                                summaries.append({
                                    "uid": uid_val,
                                    "sender": sender,
                                    "subject": subject,
                                    "date": date_str
                                })
                            except Exception:
                                pass
            except Exception:
                pass

        # Si certains UIDs n'ont pas été trouvés dans l'ordre, trier selon la liste d'origine
        uid_order = {uid: idx for idx, uid in enumerate(clean_uids)}
        summaries.sort(key=lambda s: uid_order.get(s["uid"], 999999))
        return summaries

    def move_to_trash(self, uids: list) -> int:
        """Déplace la liste d'e-mails (UIDs) vers la Corbeille."""
        if not uids:
            return 0

        self.ensure_connected()
        moved_count = 0
        total = len(uids)

        for uid in uids:
            uid_str = uid.decode("utf-8") if isinstance(uid, bytes) else str(uid)
            try:
                res, _ = self.client.uid('COPY', uid_str, f'"{self.trash_folder}"')
                if res == 'OK':
                    self.client.uid('STORE', uid_str, '+FLAGS', '(\\Deleted)')
                    moved_count += 1
            except Exception:
                pass

        try:
            self.client.expunge()
        except Exception:
            pass
        return moved_count

    def delete_permanently(self, uids: list) -> int:
        """Supprime définitivement la liste d'e-mails (UIDs). Attention : irréversible !"""
        if not uids:
            return 0

        self.ensure_connected()
        deleted_count = 0
        for uid in uids:
            uid_str = uid.decode("utf-8") if isinstance(uid, bytes) else str(uid)
            try:
                res, _ = self.client.uid('STORE', uid_str, '+FLAGS', '(\\Deleted)')
                if res == 'OK':
                    deleted_count += 1
            except Exception:
                pass

        try:
            self.client.expunge()
        except Exception:
            pass
        return deleted_count

    def get_user_labels(self) -> list:
        """Récupère la liste des libellés / dossiers personnalisés de l'utilisateur dans Gmail."""
        labels = []
        try:
            self.ensure_connected()
            status, folder_list = self.client.list()
            if status == "OK" and folder_list:
                for folder_raw in folder_list:
                    folder_str = folder_raw.decode("utf-8", errors="replace")
                    if '"/"' in folder_str:
                        name = folder_str.split('"/"')[-1].strip().strip('"')
                        if not name.startswith("[Gmail]") and name.lower() not in ["inbox", "trash", "sent", "drafts", "junk", "spam"]:
                            if name not in labels:
                                labels.append(name)
        except Exception as e:
            print_warning(f"Impossible de charger les libellés : {e}")
        return labels

    def create_label(self, label_name: str) -> bool:
        """Crée un nouveau libellé / dossier dans Gmail s'il n'existe pas encore."""
        try:
            self.ensure_connected()
            clean_name = label_name.strip()
            status, _ = self.client.create(f'"{clean_name}"')
            return status == "OK"
        except Exception:
            return False

    def add_label_to_emails(self, uids: list, label_name: str) -> int:
        """
        Attache un libellé Gmail à une liste d'UIDs en une seule requête IMAP par lot.
        Si le libellé n'existe pas encore, il est créé automatiquement.
        """
        if not uids or not label_name:
            return 0

        # Remplacer les caractères interdits/réservés dans les noms de dossiers IMAP
        clean_label = label_name.replace("&", "et").strip()
        self.create_label(clean_label)
        self.ensure_connected()

        clean_uids = []
        for u in uids:
            u_str = u.decode("utf-8") if isinstance(u, bytes) else str(u).strip()
            if u_str.isdigit():
                clean_uids.append(u_str)

        if not clean_uids:
            return 0

        uid_csv = b",".join(u.encode("utf-8") for u in clean_uids)
        label_fmt = f'("{clean_label}")'

        try:
            res, _ = self.client.uid('STORE', uid_csv, '+X-GM-LABELS', label_fmt)
            if res == 'OK':
                return len(clean_uids)
        except Exception as e:
            print_warning(f"Erreur attribution libellé '{clean_label}' : {e}")

        # Fallback individuel si le batch échoue
        success_count = 0
        for uid_str in clean_uids:
            try:
                res, _ = self.client.uid('STORE', uid_str, '+X-GM-LABELS', label_fmt)
                if res == 'OK':
                    success_count += 1
            except Exception:
                pass

        return success_count


def display_table(summaries: list, total_found: int):
    """Affiche un tableau clair des e-mails trouvés."""
    if HAS_RICH and console:
        table = Table(title=f"Aperçu des e-mails trouvés ({len(summaries)} affichés sur {total_found} au total)")
        table.add_column("UID", style="cyan", no_wrap=True)
        table.add_column("Date", style="magenta")
        table.add_column("Expéditeur", style="green")
        table.add_column("Sujet", style="bold white")

        for item in summaries:
            table.add_row(item["uid"], item["date"][:22], item["sender"][:35], item["subject"][:50])

        console.print(table)
    else:
        print(f"\n--- Aperçu des e-mails ({len(summaries)} affichés sur {total_found}) ---")
        for item in summaries:
            print(f"[{item['uid']}] {item['date'][:22]} | De: {item['sender'][:30]} | Sujet: {item['subject'][:45]}")
        print("-----------------------------------------------------\n")


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Gestionnaire & Nettoyeur de boîte Gmail par e-mail / requête IMAP"
    )
    parser.add_argument(
        "-q", "--query",
        type=str,
        help="Requête de recherche Gmail (ex: 'from:HelloWork', 'from:linkedin.com', 'subject:Newsletter')"
    )
    parser.add_argument(
        "-a", "--action",
        choices=["count", "list", "trash", "delete"],
        default=None,
        help="Action à exécuter : 'count' (compter), 'list' (afficher), 'trash' (corbeille), 'delete' (suppression définitive)"
    )
    parser.add_argument(
        "-l", "--limit",
        type=int,
        default=20,
        help="Nombre maximum d'e-mails à afficher dans le tableau d'aperçu (0 = tous). Défaut: 20"
    )
    parser.add_argument(
        "--folder",
        type=str,
        default="INBOX",
        help="Dossier dans lequel effectuer la recherche (Défaut: 'INBOX')"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mode simulation : affiche ce qui serait fait sans déplacer ni supprimer"
    )
    return parser.parse_args()


def main():
    args = parse_arguments()

    # Récupération des identifiants depuis l'environnement ou saisie
    username = os.getenv("GMAIL_USER")
    password = os.getenv("GMAIL_APP_PASSWORD")

    if not username:
        if HAS_RICH and console:
            username = Prompt.ask("Adresse Gmail")
        else:
            username = input("Adresse Gmail: ").strip()

    if not password:
        if HAS_RICH and console:
            password = Prompt.ask("Mot de passe d'application Google", password=True)
        else:
            import getpass
            password = getpass.getpass("Mot de passe d'application Google: ").strip()

    if not username or not password:
        print_error("Adresse e-mail et mot de passe d'application requis !")
        sys.exit(1)

    manager = GmailManager(username, password)
    manager.connect()

    try:
        # 1. Obtenir la requête de recherche
        query = args.query
        if not query:
            print("\nExemples de requêtes :")
            print("  - from:HelloWork")
            print("  - from:notifications@linkedin.com")
            print("  - subject:Offre d'emploi")
            print("  - older_than:30d\n")
            if HAS_RICH and console:
                query = Prompt.ask("Entrez le terme ou le filtre de recherche", default="from:HelloWork")
            else:
                query = input("Entrez le terme ou le filtre de recherche [from:HelloWork]: ").strip() or "from:HelloWork"

        # 2. Effectuer la recherche
        uids = manager.search_emails(query, folder=args.folder)
        total_count = len(uids)

        if total_count == 0:
            print_warning(f"Aucun e-mail trouvé pour la recherche '{query}'.")
            return

        print_success(f"Nombre d'e-mails trouvés pour '{query}' : {total_count}")

        # 3. Récupérer un aperçu
        limit = args.limit
        summaries = manager.fetch_email_summaries(uids, limit=limit if limit > 0 else total_count)
        display_table(summaries, total_count)

        # 4. Choix de l'action s'il n'est pas spécifié en argument
        action = args.action
        if not action:
            print("Que souhaitez-vous faire ?")
            print("  [1] Compter uniquement (Quitter)")
            print("  [2] Déplacer TOUS ces e-mails vers la Corbeille (Recommandé)")
            print("  [3] Supprimer définitivement TOUS ces e-mails (Irréversible !)")
            
            if HAS_RICH and console:
                choice = Prompt.ask("Votre choix", choices=["1", "2", "3"], default="2")
            else:
                choice = input("Votre choix [1/2/3] (défaut 2): ").strip() or "2"

            if choice == "1":
                action = "count"
            elif choice == "2":
                action = "trash"
            elif choice == "3":
                action = "delete"

        if action == "count" or action == "list":
            print_info("Opération terminée sans modification de la boîte mail.")
            return

        if args.dry-run:
            print_warning(f"[MODE SIMULATION] Action '{action}' non exécutée sur les {total_count} e-mails.")
            return

        # 5. Demande de confirmation explicite
        if action == "trash":
            msg = f"Êtes-vous SÛR de vouloir déplacer les {total_count} e-mails correspondant à '{query}' vers la Corbeille ?"
            confirmed = Confirm.ask(msg, default=False) if (HAS_RICH and console) else (input(f"{msg} (o/N): ").lower().startswith('o'))
            if confirmed:
                count = manager.move_to_trash(uids)
                print_success(f"{count} e-mails ont été déplacés vers la Corbeille Gmail.")
            else:
                print_info("Opération annulée.")

        elif action == "delete":
            msg = f"⚠️ ATTENTION : Êtes-vous SÛR de vouloir SUPPRIMER DÉFINITIVEMENT {total_count} e-mails pour '{query}' ?"
            confirmed = Confirm.ask(msg, default=False) if (HAS_RICH and console) else (input(f"{msg} (o/N): ").lower().startswith('o'))
            if confirmed:
                count = manager.delete_permanently(uids)
                print_success(f"{count} e-mails ont été supprimés définitivement.")
            else:
                print_info("Opération annulée.")

    finally:
        manager.disconnect()


if __name__ == "__main__":
    main()
