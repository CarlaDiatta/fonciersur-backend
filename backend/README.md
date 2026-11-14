# Backend FoncierSur

## Démarrage local

Prérequis : Node.js et PostgreSQL. Docker Desktop est optionnel.

### Avec PostgreSQL déjà installé

Créez la base `fonciersur` dans PostgreSQL si elle n'existe pas encore, par exemple avec pgAdmin ou `CREATE DATABASE fonciersur;`. Configurez ensuite votre fichier local `.env` avec les paramètres de votre installation (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` et `DB_PASSWORD`). Chaque développeur utilise ses propres identifiants locaux ; le fichier `.env` n'est pas partagé.

### Avec Docker Desktop (optionnel)

Depuis le dossier `backend`, créez votre fichier local de configuration si nécessaire et démarrez le service PostgreSQL isolé :

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d
```

### Configuration des services

Les deux services lisent le même fichier `.env` et doivent utiliser le même `JWT_SECRET` (au moins 32 caractères aléatoires en production). Ne partagez pas ce secret et ne le commitez jamais. Les fichiers `.env` sont ignorés par Git.

```powershell
npm install
node src/scripts/seed.js
```

### Lancer les deux API

Depuis deux terminaux distincts, dans le dossier `backend` :

```powershell
npm run dev:cadastre
```

```powershell
npm run dev:promoteur
```

L'API Cadastre/Notaire écoute sur `http://localhost:5000/api/v1` et l'API Promoteur sur `http://localhost:5001/api/v1`. Les deux autorisent le frontend sur le port 5173. L'authentification est disponible sur les deux API ; le frontend dirige ensuite les requêtes vers le service correspondant au rôle connecté.

La soumission Promoteur crée d'abord un brouillon, puis appelle `POST /api/v1/validations` sur le service Cadastre. Les décisions Cadastre/Notaire sont transmises au service Promoteur par `PATCH /api/v1/parcelles/:id/statut`; les échecs de transmission sont conservés dans une file PostgreSQL et réessayés automatiquement. La lecture interservice se fait via `GET /api/v1/parcelles/:id`. Tous les statuts persistés sont `BROUILLON`, `SOUMISE`, `VALIDE_CADASTRE`, `REJETE_CADASTRE`, `CERTIFIEE` ou `REJETE_NOTAIRE`.

Pour Docker, les paramètres `DB_*` de `.env` doivent correspondre à `.env.example`. Le conteneur utilise le port `5433` pour éviter les conflits avec une installation PostgreSQL sur `5432`. Les identifiants de `.env.example` sont réservés au développement local avec Docker ; ne les utilisez pas en production.

Pour arrêter le conteneur Docker sans supprimer les données, utilisez cette commande depuis `backend` :

```powershell
docker compose down
```
