#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Interface Web Visuelle & Interactive avec Agent IA & Gestion de Libellés Gmail (Streamlit, Gemini AI)
2 Modules :
 1. Nettoyage & Corbeille (Gmail Mailbox Cleaner)
 2. Classement & Libellés IA (Gmail AI Label Organizer)
"""

import os
import streamlit as st
import pandas as pd
from dotenv import load_dotenv

# Importer la classe de gestion Gmail, le module IA et le cache manager
from gmail_manager import GmailManager, decode_mime_words
from ai_analyzer import analyze_emails_with_ai, categorize_emails_with_ai
from cache_manager import (
    get_kept_uids, add_to_kept, remove_from_kept,
    filter_out_kept, get_kept_items_list, clear_kept_cache,
    get_categorized_uids, add_to_categorized, get_categorized_items_list, clear_categorized_cache
)

# Configuration de la page Streamlit
st.set_page_config(
    page_title="Gmail Manager, Nettoyeur & Libellés IA",
    page_icon="🏷️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Chargement du .env s'il existe
load_dotenv()

# Style CSS personnalisé
st.markdown("""
<style>
    .main-header {
        font-size: 2.3rem;
        font-weight: 700;
        color: #EA4335;
        margin-bottom: 0px;
    }
    .sub-header {
        font-size: 1.1rem;
        color: #5f6368;
        margin-bottom: 20px;
    }
    .stButton>button {
        border-radius: 8px;
    }
</style>
""", unsafe_allow_html=True)


# Fichier de configuration persistant
CONFIG_FILE = "config.json"

def load_saved_config():
    """Charge la configuration persistante depuis config.json s'il existe."""
    if os.path.exists(CONFIG_FILE):
        try:
            import json
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_config(user, password, api_key, auto_connect=True):
    """Sauvegarde les identifiants de manière persistante."""
    import json
    try:
        data = {
            "GMAIL_USER": user,
            "GMAIL_APP_PASSWORD": password,
            "GEMINI_API_KEY": api_key,
            "AUTO_CONNECT": auto_connect
        }
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        with open(".env", "w", encoding="utf-8") as f:
            f.write(f"GMAIL_USER={user}\nGMAIL_APP_PASSWORD={password}\nGEMINI_API_KEY={api_key}\n")
        return True
    except Exception as e:
        print(f"Erreur sauvegarde config : {e}")
        return False


def get_gmail_manager():
    """Récupère ou initialise l'instance GmailManager stockée dans la session Streamlit."""
    if "gmail_manager" not in st.session_state:
        st.session_state.gmail_manager = None
    return st.session_state.gmail_manager


def main():
    # --- HEADER ---
    st.markdown('<div class="main-header">📧 Gmail Assistant & 🤖 Agent IA</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-header">Nettoyez votre boîte mail et classez vos e-mails importants dans des libellés Gmail avec l\'IA.</div>', unsafe_allow_html=True)

    # Chargement de la configuration sauvegardée
    saved_cfg = load_saved_config()
    default_gemini_key = saved_cfg.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY", "")
    env_user = saved_cfg.get("GMAIL_USER") or os.getenv("GMAIL_USER", "")
    env_pass = saved_cfg.get("GMAIL_APP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD", "")
    auto_connect_saved = saved_cfg.get("AUTO_CONNECT", True)

    # --- SIDEBAR (PARAMÈTRES DE CONNEXION, CLÉ IA & CACHE) ---
    with st.sidebar:
        st.header("🔑 Connexion Gmail")
        
        user = st.text_input("Adresse Gmail", value=env_user, placeholder="exemple@gmail.com")
        password = st.text_input("Mot de passe d'application", value=env_pass, type="password", help="Générez-le sur https://myaccount.google.com/apppasswords")
        remember_me = st.checkbox("💾 Mémoriser et connecter automatiquement", value=auto_connect_saved)

        col_conn1, col_conn2 = st.columns(2)
        with col_conn1:
            connect_btn = st.button("🔌 Se connecter", use_container_width=True)
        with col_conn2:
            disconnect_btn = st.button("🔌 Déconnexion", use_container_width=True)

        if "first_load_done" not in st.session_state:
            st.session_state.first_load_done = True
            if auto_connect_saved and env_user and env_pass and not st.session_state.get("connected"):
                connect_btn = True

        if connect_btn:
            if not user or not password:
                st.error("Veuillez remplir l'email et le mot de passe d'application.")
            else:
                with st.spinner("Connexion au serveur IMAP Gmail..."):
                    manager = GmailManager(user, password)
                    try:
                        manager.connect()
                        st.session_state.gmail_manager = manager
                        st.session_state.connected = True
                        if remember_me:
                            save_config(user, password, default_gemini_key, auto_connect=True)
                        st.success("Connecté avec succès !")
                    except Exception as e:
                        st.error(f"Erreur de connexion : {e}")

        if disconnect_btn:
            if st.session_state.get("gmail_manager"):
                st.session_state.gmail_manager.disconnect()
            st.session_state.gmail_manager = None
            st.session_state.connected = False
            save_config(user, password, default_gemini_key, auto_connect=False)
            st.info("Déconnecté.")

        if st.session_state.get("connected"):
            st.sidebar.success(f"Connecté : **{user}**")
        else:
            st.sidebar.warning("Non connecté")

        st.divider()

        # Section Clé API Gemini
        st.header("🤖 Agent IA Gemini")
        gemini_api_key = st.text_input(
            "Clé API Google Gemini (Gratuite)",
            value=default_gemini_key,
            type="password",
            help="Obtenez une clé d'API gratuite sur Google AI Studio"
        )

        if st.button("💾 Enregistrer mes identifiants", use_container_width=True):
            save_config(user, password, gemini_api_key, auto_connect=remember_me)
            st.success("Identifiants enregistrés avec succès !")

        st.divider()

        # Section Mémoire / Cache des e-mails conservés et catégorisés
        st.header("🧠 Mémoire locale")
        
        kept_count = len(get_kept_uids())
        st.write(f"• **{kept_count}** e-mail(s) gardé(s) (Nettoyage).")
        if kept_count > 0:
            if st.button("🔄 Réinitialiser mémoire Nettoyage", use_container_width=True):
                clear_kept_cache()
                st.session_state.pop("summaries_to_display", None)
                st.success("Mémoire Nettoyage réinitialisée !")
                st.rerun()

        cat_count = len(get_categorized_uids())
        st.write(f"• **{cat_count}** e-mail(s) déjà étiqueté(s) (Libellés).")
        if cat_count > 0:
            with st.expander("Voir les e-mails étiquetés"):
                cat_items = get_categorized_items_list()
                for item in cat_items[:10]:
                    st.caption(f"• `[{item.get('label', '')}]` **{item.get('subject', '')[:25]}**")
                if len(cat_items) > 10:
                    st.caption(f"... et {len(cat_items) - 10} autre(s)")

            if st.button("🔄 Réinitialiser mémoire Libellés", use_container_width=True):
                clear_categorized_cache()
                st.session_state.pop("label_summaries", None)
                st.success("Mémoire Libellés réinitialisée !")
                st.rerun()

    manager = get_gmail_manager()

    if not manager or not st.session_state.get("connected"):
        st.info("👈 Veuillez saisir vos identifiants dans le panneau latéral gauche et cliquer sur **Se connecter** pour démarrer.")
        return

    # --- ONGLET 1 ET ONGLET 2 ---
    tab_cleaner, tab_labels = st.tabs(["🗑️ Nettoyage & Corbeille", "🏷️ Classement & Libellés IA"])

    # ==========================================
    # ONGLET 1 : NETTOYAGE & CORBEILLE
    # ==========================================
    with tab_cleaner:
        st.subheader("🔍 Recherche & Nettoyage")

        if "cleaner_search_input" not in st.session_state:
            st.session_state["cleaner_search_input"] = ""

        col_f1, col_f2, col_f3, col_f4, col_f5 = st.columns(5)

        with col_f1:
            if st.button("🎯 HelloWork", use_container_width=True):
                st.session_state["cleaner_search_input"] = "from:HelloWork"
                st.session_state["trigger_cleaner_search"] = True
                st.rerun()
        with col_f2:
            if st.button("💼 LinkedIn", use_container_width=True):
                st.session_state["cleaner_search_input"] = "from:linkedin.com"
                st.session_state["trigger_cleaner_search"] = True
                st.rerun()
        with col_f3:
            if st.button("📰 Newsletters", use_container_width=True):
                st.session_state["cleaner_search_input"] = "subject:newsletter OR unsubscribe"
                st.session_state["trigger_cleaner_search"] = True
                st.rerun()
        with col_f4:
            if st.button("⏳ Mails > 30 jours", use_container_width=True):
                st.session_state["cleaner_search_input"] = "older_than:30d"
                st.session_state["trigger_cleaner_search"] = True
                st.rerun()
        with col_f5:
            if st.button("⚡ Mails < 30 jours", use_container_width=True):
                st.session_state["cleaner_search_input"] = "newer_than:30d"
                st.session_state["trigger_cleaner_search"] = True
                st.rerun()

        search_query = st.text_input(
            "Filtre de recherche (Syntaxe de recherche Gmail - vide ou 'ALL' pour tout voir)",
            key="cleaner_search_input",
            help="Exemples: from:linkedin.com, from:amazon.fr, subject:Offre, older_than:60d"
        )

        col_opt1, col_opt2, col_opt3 = st.columns([2, 1, 1])
        with col_opt1:
            limit = st.slider("Nombre maximum d'e-mails à afficher", min_value=10, max_value=200, value=50, step=10, key="cleaner_limit_slider")
        with col_opt2:
            hide_kept = st.checkbox("Masquer les e-mails déjà conservés", value=True, key="cleaner_hide_kept_check")
        with col_opt3:
            st.write("") 
            search_clicked = st.button("🔎 Rechercher", type="primary", use_container_width=True, key="cleaner_search_btn")

        # Déterminer si une recherche doit être lancée
        trigger_search = st.session_state.pop("trigger_cleaner_search", False)
        need_search = (
            search_clicked
            or trigger_search
            or "summaries_to_display" not in st.session_state
            or (search_query != st.session_state.get("last_search_query"))
            or (hide_kept != st.session_state.get("last_hide_kept"))
        )

        if need_search:
            with st.spinner(f"Recherche des e-mails pour '{search_query}'..."):
                all_uids = manager.search_emails(search_query)
                st.session_state.last_search_uids = all_uids
                st.session_state.last_search_query = search_query
                st.session_state.last_hide_kept = hide_kept
                st.session_state.ai_results = {}

                kept_uids = get_kept_uids()
                if hide_kept:
                    active_uids = [u for u in all_uids if (u.decode('utf-8') if isinstance(u, bytes) else str(u)) not in kept_uids]
                else:
                    active_uids = all_uids

                st.session_state.active_uids = active_uids

                if active_uids:
                    st.session_state.summaries_to_display = manager.fetch_email_summaries(active_uids, limit=limit)
                else:
                    st.session_state.summaries_to_display = []

        all_uids = st.session_state.get("last_search_uids", [])
        active_uids = st.session_state.get("active_uids", [])
        summaries_to_display = st.session_state.get("summaries_to_display", [])
        ai_results = st.session_state.get("ai_results", {})

        total_count = len(all_uids)
        active_count = len(active_uids)
        kept_hidden_count = total_count - active_count

        st.divider()

        st.subheader("🤖 Agent IA de Tri Intelligent")
        
        col_ai1, col_ai2 = st.columns([3, 1])
        with col_ai1:
            st.write("L'Agent IA va analyser les e-mails affichés pour déterminer s'ils sont **inutiles**, **à conserver** ou **à vérifier**.")
            if kept_hidden_count > 0:
                st.info(f"ℹ️ **{kept_hidden_count}** e-mail(s) déjà mémorisé(s) comme conservé(s) ont été masqués de la recherche.")
        with col_ai2:
            analyze_ai_btn = st.button("⚡ Lancer l'analyse IA", use_container_width=True, key="cleaner_ai_btn")

        if analyze_ai_btn:
            if not gemini_api_key:
                st.error("Veuillez saisir votre clé d'API Google Gemini dans la barre latérale gauche pour utiliser l'Agent IA.")
            elif not summaries_to_display:
                st.warning("Aucun e-mail à analyser.")
            else:
                with st.spinner("Analyse intelligente des e-mails par l'Agent IA Gemini..."):
                    try:
                        res = analyze_emails_with_ai(summaries_to_display, gemini_api_key)
                        st.session_state.ai_results = res
                        ai_results = res
                        st.success("Analyse IA terminée avec succès !")
                    except Exception as e:
                        st.error(f"Erreur d'analyse IA : {e}")

        if ai_results:
            inutiles_cnt = sum(1 for v in ai_results.values() if v.get("recommendation") == "INUTILE")
            conserver_cnt = sum(1 for v in ai_results.values() if v.get("recommendation") == "CONSERVER")
            verifier_cnt = sum(1 for v in ai_results.values() if v.get("recommendation") == "A_VERIFIER")

            col_aim1, col_aim2, col_aim3 = st.columns(3)
            with col_aim1:
                st.markdown(f"🔴 **Recommandés Corbeille (IA) :** `{inutiles_cnt}`")
            with col_aim2:
                st.markdown(f"🟢 **À conserver (IA) :** `{conserver_cnt}`")
            with col_aim3:
                st.markdown(f"🟡 **À vérifier (IA) :** `{verifier_cnt}`")

        st.divider()

        st.subheader(f"📋 Aperçu des e-mails ({len(summaries_to_display)} affichés sur {active_count} non conservés - Total trouvé : {total_count})")

        filter_option = "Tous les e-mails"
        if ai_results:
            filter_option = st.radio(
                "Filtrer la vue :",
                ["Tous les e-mails", "🗑️ Uniquement les e-mails jugés INUTILES par l'IA", "📌 Uniquement les e-mails À CONSERVER"],
                horizontal=True,
                key="cleaner_filter_radio"
            )

        df_data = []
        for item in summaries_to_display:
            uid = str(item["uid"])
            ai_info = ai_results.get(uid, {})
            reco = ai_info.get("recommendation", "Non analysé")
            reason = ai_info.get("reasoning", "-")

            if filter_option == "🗑️ Uniquement les e-mails jugés INUTILES par l'IA" and reco != "INUTILE":
                continue
            if filter_option == "📌 Uniquement les e-mails À CONSERVER" and reco != "CONSERVER":
                continue

            default_selected = True if reco == "INUTILE" or not ai_results else False

            reco_badge = "⚪ Non analysé"
            if reco == "INUTILE":
                reco_badge = "🔴 Inutile (Corbeille)"
            elif reco == "CONSERVER":
                reco_badge = "🟢 À conserver"
            elif reco == "A_VERIFIER":
                reco_badge = "🟡 À vérifier"

            df_data.append({
                "Sélectionner": default_selected,
                "Avis IA": reco_badge,
                "Explication IA": reason,
                "UID": uid,
                "Date": item["date"][:22],
                "Expéditeur": item["sender"],
                "Sujet": item["subject"]
            })

        if not df_data:
            if total_count > 0 and kept_hidden_count == total_count:
                st.info(f"ℹ️ Tous les e-mails trouvés ({total_count}) pour '{search_query}' sont déjà enregistrés dans votre mémoire des e-mails conservés. Décochez **'Masquer les e-mails déjà conservés'** ci-dessus ou cliquez sur **'🔄 Réinitialiser la mémoire'** dans la barre latérale si vous souhaitez les réexaminer.")
            else:
                st.warning(f"Aucun e-mail trouvé pour '{search_query}'.")
        else:
            df = pd.DataFrame(df_data)

            column_config = {
                "Sélectionner": st.column_config.CheckboxColumn("Sélectionner", default=True, width="small"),
                "Avis IA": st.column_config.TextColumn("Avis IA", width="medium"),
                "Explication IA": st.column_config.TextColumn("Explication IA", width="large"),
                "UID": st.column_config.TextColumn("UID", disabled=True, width="small"),
                "Date": st.column_config.TextColumn("Date", disabled=True, width="medium"),
                "Expéditeur": st.column_config.TextColumn("Expéditeur", disabled=True, width="medium"),
                "Sujet": st.column_config.TextColumn("Sujet", disabled=True, width="large"),
            }

            edited_df = st.data_editor(
                df,
                column_config=column_config,
                disabled=["Avis IA", "Explication IA", "UID", "Date", "Expéditeur", "Sujet"],
                hide_index=True,
                use_container_width=True,
                key="email_data_editor_cleaner"
            )

            selected_uids = edited_df[edited_df["Sélectionner"] == True]["UID"].tolist()
            unselected_uids = edited_df[edited_df["Sélectionner"] == False]["UID"].tolist()
            selected_uids_bytes = [uid.encode('utf-8') for uid in selected_uids]

            st.divider()

            st.subheader("🗑️ Action de Nettoyage")

            col_act1, col_act2 = st.columns([2, 1])

            with col_act1:
                st.markdown(f"• 🔴 **{len(selected_uids)}** e-mail(s) coché(s) → **Seront envoyés à la Corbeille Gmail**")
                st.markdown(f"• 🟢 **{len(unselected_uids)}** e-mail(s) décoché(s) → **Seront mémorisés comme à garder**")
                confirm_trash = st.checkbox(
                    f"Je confirme le déplacement de {len(selected_uids)} e-mail(s) vers la Corbeille et la mémorisation des {len(unselected_uids)} e-mail(s) conservé(s)",
                    key="confirm_trash_check"
                )

            with col_act2:
                trash_and_keep_btn = st.button(
                    f"🚀 Valider : Supprimer ({len(selected_uids)}) & Mémoriser ({len(unselected_uids)})",
                    type="primary",
                    disabled=not confirm_trash or (len(selected_uids) == 0 and len(unselected_uids) == 0),
                    use_container_width=True,
                    key="validate_trash_btn"
                )

            if trash_and_keep_btn:
                with st.spinner("Traitement en cours (Corbeille & Mémorisation)..."):
                    if unselected_uids:
                        items_to_keep = [e for e in summaries_to_display if str(e["uid"]) in unselected_uids]
                        add_to_kept(items_to_keep)

                    moved_count = 0
                    if selected_uids_bytes:
                        progress_bar = st.progress(0)
                        moved_count = manager.move_to_trash(selected_uids_bytes)
                        progress_bar.progress(100)

                    st.balloons()
                    msg = f"🎉 **{moved_count}** e-mail(s) envoyé(s) à la Corbeille Gmail"
                    if len(unselected_uids) > 0:
                        msg += f" et **{len(unselected_uids)}** e-mail(s) mémorisé(s) comme à garder !"
                    else:
                        msg += " !"
                    st.success(msg)

                    st.session_state.summaries_to_display = []
                    st.session_state.pop("ai_results", None)
                    st.rerun()

    # ==========================================
    # ONGLET 2 : CLASSEMENT & LIBELLÉS IA
    # ==========================================
    with tab_labels:
        st.subheader("🏷️ Catégorisation & Libellés Gmail par l'IA")
        st.write("L'Agent IA peut analyser vos e-mails importants et leur attribuer automatiquement des **libellés Gmail** (ex: *Factures*, *Recrutement*, *Achats*, *Voyages*, *Pro*, *Banque*).")

        # Récupérer la liste des libellés Gmail existants de l'utilisateur
        existing_gmail_labels = manager.get_user_labels()
        default_categories = ["Factures", "Recrutement", "Achats", "Voyages", "Pro", "Banque", "Administratif"]
        
        # Fusionner avec les libellés existants
        all_suggested_labels = sorted(list(set(existing_gmail_labels + default_categories)))

        col_l1, col_l2 = st.columns([3, 1])
        with col_l1:
            selected_labels = st.multiselect(
                "Catégories / Libellés cibles autorisés pour l'IA :",
                options=all_suggested_labels,
                default=[l for l in ["Factures", "Recrutement", "Achats", "Voyages", "Pro", "Banque"] if l in all_suggested_labels],
                help="Vous pouvez sélectionner les libellés existants de votre compte Gmail ou en saisir de nouveaux."
            )
        with col_l2:
            new_label_input = st.text_input("➕ Ajouter un libellé sur mesure", placeholder="Ex: Projet X")
            if st.button("Ajouter libellé", use_container_width=True):
                if new_label_input and new_label_input.strip() not in selected_labels:
                    selected_labels.append(new_label_input.strip())
                    st.success(f"Libellé '{new_label_input.strip()}' ajouté !")

        st.divider()

        # Recherche des e-mails à classer
        st.subheader("🔍 Sélection des e-mails à catégoriser")
        col_lsearch1, col_lsearch2 = st.columns([3, 1])
        with col_lsearch1:
            label_search_query = st.text_input(
                "Filtre de recherche pour le classement",
                value="INBOX",
                help="Par défaut 'INBOX' pour classer votre boîte de réception principale, ou une recherche spécifique (ex: subject:facture)",
                key="label_search_query_input"
            )
        with col_lsearch2:
            fetch_label_emails_btn = st.button("🔎 Recharger e-mails", type="primary", use_container_width=True, key="fetch_label_emails_btn")

        col_lopt1, col_lopt2 = st.columns([1, 1])
        with col_lopt1:
            label_limit = st.slider("Nombre d'e-mails à analyser", min_value=5, max_value=100, value=20, step=5, key="label_limit_slider")
        with col_lopt2:
            hide_categorized = st.checkbox("Masquer les e-mails déjà catégorisés", value=True, key="label_hide_categorized_check")

        trigger_label_search = (
            fetch_label_emails_btn
            or "label_summaries" not in st.session_state
            or (label_search_query != st.session_state.get("last_label_search_query"))
            or (hide_categorized != st.session_state.get("last_label_hide_categorized"))
        )

        if trigger_label_search:
            with st.spinner(f"Chargement des e-mails pour '{label_search_query}'..."):
                label_all_uids = manager.search_emails(label_search_query)
                st.session_state.last_label_search_query = label_search_query
                st.session_state.last_label_hide_categorized = hide_categorized

                categorized_uids = get_categorized_uids()
                if hide_categorized:
                    active_label_uids = [u for u in label_all_uids if (u.decode('utf-8') if isinstance(u, bytes) else str(u)) not in categorized_uids]
                else:
                    active_label_uids = label_all_uids

                st.session_state.active_label_uids = active_label_uids

                if active_label_uids:
                    st.session_state.label_summaries = manager.fetch_email_summaries(active_label_uids, limit=label_limit)
                else:
                    st.session_state.label_summaries = []
                st.session_state.label_ai_results = {}

        label_all_uids = st.session_state.get("last_label_search_uids", [])
        active_label_uids = st.session_state.get("active_label_uids", [])
        label_summaries = st.session_state.get("label_summaries", [])
        label_ai_results = st.session_state.get("label_ai_results", {})

        st.write(f"**{len(label_summaries)}** e-mail(s) non étiqueté(s) affiché(s) sur {len(active_label_uids)} au total.")

        if not label_summaries:
            st.info("ℹ️ Tous les e-mails correspondant à cette recherche ont déjà été étiquetés et mémorisés ! Décochez 'Masquer les e-mails déjà catégorisés' ou réinitialisez la mémoire des libellés dans la barre latérale pour les revoir.")
        else:
            categorize_ai_btn = st.button("⚡ Lancer la catégorisation IA", type="primary", key="categorize_ai_btn")

            if categorize_ai_btn:
                if not gemini_api_key:
                    st.error("Veuillez saisir votre clé d'API Google Gemini dans le panneau latéral gauche.")
                elif not selected_labels:
                    st.error("Veuillez sélectionner au moins un libellé cible.")
                else:
                    with st.spinner("Analyse et attribution des libellés par l'Agent IA Gemini..."):
                        try:
                            cat_res = categorize_emails_with_ai(label_summaries, selected_labels, gemini_api_key)
                            st.session_state.label_ai_results = cat_res
                            label_ai_results = cat_res
                            st.success("Catégorisation IA terminée avec succès !")
                        except Exception as e:
                            st.error(f"Erreur lors de la catégorisation IA : {e}")

            # Rendu du tableau de catégorisation
            label_df_data = []
            for item in label_summaries:
                uid = str(item["uid"])
                cat_info = label_ai_results.get(uid, {})
                assigned = cat_info.get("assigned_label", selected_labels[0] if selected_labels else "Autre")
                reason = cat_info.get("reasoning", "-")

                label_df_data.append({
                    "Appliquer": True if label_ai_results else False,
                    "Libellé Suggéré (IA)": assigned,
                    "Explication IA": reason,
                    "UID": uid,
                    "Date": item["date"][:22],
                    "Expéditeur": item["sender"],
                    "Sujet": item["subject"]
                })

            df_labels = pd.DataFrame(label_df_data)

            edited_label_df = st.data_editor(
                df_labels,
                column_config={
                    "Appliquer": st.column_config.CheckboxColumn("Appliquer", default=True, width="small"),
                    "Libellé Suggéré (IA)": st.column_config.SelectboxColumn("Libellé Suggéré (IA)", options=selected_labels, width="medium"),
                    "Explication IA": st.column_config.TextColumn("Explication IA", width="large"),
                    "UID": st.column_config.TextColumn("UID", disabled=True, width="small"),
                    "Date": st.column_config.TextColumn("Date", disabled=True, width="medium"),
                    "Expéditeur": st.column_config.TextColumn("Expéditeur", disabled=True, width="medium"),
                    "Sujet": st.column_config.TextColumn("Sujet", disabled=True, width="large"),
                },
                disabled=["Explication IA", "UID", "Date", "Expéditeur", "Sujet"],
                hide_index=True,
                use_container_width=True,
                key="label_data_editor"
            )

            # Traitement de l'application des libellés dans Gmail
            selected_to_label = edited_label_df[edited_label_df["Appliquer"] == True]

            st.divider()

            col_label_act1, col_label_act2 = st.columns([2, 1])
            with col_label_act1:
                st.write(f"**{len(selected_to_label)}** e-mail(s) à étiqueter dans Gmail.")

            with col_label_act2:
                apply_labels_btn = st.button(
                    f"🏷️ Appliquer les Libellés dans Gmail ({len(selected_to_label)})",
                    type="primary",
                    disabled=len(selected_to_label) == 0,
                    use_container_width=True,
                    key="apply_labels_gmail_btn"
                )

            if apply_labels_btn:
                with st.spinner("Application des libellés dans votre compte Gmail..."):
                    total_applied = 0
                    progress_bar = st.progress(0)

                    # Grouper par libellé pour des requêtes groupées efficaces
                    grouped_by_label = selected_to_label.groupby("Libellé Suggéré (IA)")
                    total_groups = len(grouped_by_label)
                    current_idx = 0

                    items_to_save_in_cache = []

                    for label_name, group in grouped_by_label:
                        uids_to_tag = group["UID"].tolist()
                        uids_bytes = [u.encode('utf-8') for u in uids_to_tag]
                        count = manager.add_label_to_emails(uids_bytes, label_name)
                        total_applied += count
                        current_idx += 1
                        progress_bar.progress(int((current_idx / total_groups) * 100))

                        # Préparer les objets pour le cache
                        for _, row in group.iterrows():
                            items_to_save_in_cache.append({
                                "uid": row["UID"],
                                "label": label_name,
                                "subject": row.get("Sujet", ""),
                                "sender": row.get("Expéditeur", ""),
                                "date": row.get("Date", "")
                            })

                    # Mémoriser dans categorized_emails.json !
                    if items_to_save_in_cache:
                        add_to_categorized(items_to_save_in_cache)

                    st.balloons()
                    st.success(f"🎉 **{total_applied}** e-mail(s) étiqueté(s) et mémorisé(s) comme catégorisé(s) dans Gmail !")
                    st.session_state.pop("label_summaries", None)
                    st.session_state.pop("label_ai_results", None)
                    st.rerun()


if __name__ == "__main__":
    main()
