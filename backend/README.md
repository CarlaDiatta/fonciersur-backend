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

### Lancer le backend

Depuis le dossier `backend`, pour l'une ou l'autre option PostgreSQL :

```powershell
npm install
node src/scripts/seed.js
node src/server.js
```

Pour Docker, les paramètres `DB_*` de `.env` doivent correspondre à `.env.example`. Le conteneur utilise le port `5433` pour éviter les conflits avec une installation PostgreSQL sur `5432`. Les identifiants de `.env.example` sont réservés au développement local avec Docker ; ne les utilisez pas en production.

Pour arrêter le conteneur Docker sans supprimer les données, utilisez cette commande depuis `backend` :

```powershell
docker compose down
```
