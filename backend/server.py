from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging

try:
    from woob.core import Woob
    from woob.capabilities.bank import CapBank
except ImportError:
    Woob = None

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Woob Bank API", description="Micro-service local pour récupérer les soldes bancaires.")

# Autoriser toutes les origines locales (le frontend Vite par défaut est sur 5173, mais on autorise large pour être sûr)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En local, on peut se permettre "*" ou cibler ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AccountBalance(BaseModel):
    id: str
    label: str
    balance: float
    currency: str
    bank_name: str

class BalancesResponse(BaseModel):
    accounts: list[AccountBalance]
    total: float

@app.get("/api/balances", response_model=BalancesResponse)
def get_balances():
    if Woob is None:
        raise HTTPException(status_code=500, detail="La librairie Woob n'est pas installée ou accessible.")

    try:
        # Instanciation de Woob. Par défaut, il charge les identifiants configurés via `woob config add` (stockés dans ~/.config/woob)
        woob = Woob()
        woob.load_backends(caps=CapBank)
        
        accounts_data = []
        total_balance = 0.0

        # On itère sur tous les comptes bancaires récupérés par Woob
        for account in woob.iter_accounts():
            # Récupérer le nom du backend (ex: 'creditagricole', 'boursorama')
            backend_name = account.backend.name if account.backend else "Banque inconnue"
            
            balance = float(account.balance)
            total_balance += balance

            accounts_data.append(AccountBalance(
                id=account.id,
                label=account.label,
                balance=balance,
                currency=account.currency or "EUR",
                bank_name=backend_name.capitalize()
            ))

        return BalancesResponse(accounts=accounts_data, total=total_balance)

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des soldes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Lancement du serveur sur le port 8000
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
