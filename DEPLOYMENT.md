# Guide de Déploiement - Cmotion Réservation

## 1. Créer la base de données Neon

1. Aller sur [neon.tech](https://neon.tech) et créer un compte
2. Créer un nouveau projet PostgreSQL
3. Copier la connection string (format : `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)

## 2. Configurer Stripe

1. Créer un compte sur [stripe.com](https://stripe.com)
2. En mode test, récupérer :
   - **Clé publique** : `pk_test_xxx` (dans Developers → API keys)
   - **Clé secrète** : `sk_test_xxx` (dans Developers → API keys)
3. Créer un webhook :
   - URL : `https://votre-domaine.vercel.app/api/stripe/webhook`
   - Événements à écouter : `checkout.session.completed`, `checkout.session.expired`
   - Récupérer le **Signing secret** : `whsec_xxx`

## 3. Configurer Resend

1. Créer un compte sur [resend.com](https://resend.com)
2. Créer une API key
3. Configurer un domaine d'envoi (ou utiliser le domaine de test `onboarding@resend.dev`)

## 4. Configuration locale

```bash
# Copier le fichier d'exemple
cp .env.example .env.local

# Éditer .env.local avec vos vraies valeurs :
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@votredomaine.com
ADMIN_PASSWORD=votre_mot_de_passe_securise
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 5. Initialiser la base de données

```bash
# Pousser le schéma vers Neon
npm run db:push

# Créer les 2 événements + 55 tables + 440 sièges
npm run db:seed
```

Vous devriez voir :
```
Created event: Spectacle +12 ans (ID: 1)
  Row 1, Table 1 (VIP) - 8 seats
  Row 1, Table 2 (VIP) - 8 seats
  ...
Created event: Spectacle -12 ans (ID: 2)
  ...
Total: 2 events, 110 tables, 880 seats
```

## 6. Tester en local

```bash
npm run dev
```

Ouvrir http://localhost:3000 :
- Page d'accueil : choisir un spectacle
- Plan de salle : cliquer sur une table VIP ou des sièges normaux
- Formulaire : remplir les informations des convives
- Paiement : utiliser le bouton "Payer (test)" pour simuler un paiement

Admin : http://localhost:3000/admin
- Mot de passe : celui défini dans `ADMIN_PASSWORD`

## 7. Déployer sur Vercel

### Via l'interface Vercel

1. Aller sur [vercel.com](https://vercel.com)
2. Importer le repo GitHub `mendlyio/cmotion-reservation`
3. Configurer les variables d'environnement :
   - `DATABASE_URL`
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_BASE_URL` (ex: `https://cmotion-reservation.vercel.app`)
   - `CRON_SECRET` (générer un secret aléatoire pour le cron)
4. Déployer

### Via CLI

```bash
npm i -g vercel
vercel login
vercel --prod

# Ajouter les variables d'environnement
vercel env add DATABASE_URL
vercel env add STRIPE_SECRET_KEY
# ... etc pour toutes les variables
```

## 8. Configurer le webhook Stripe en production

1. Dans Stripe Dashboard → Developers → Webhooks
2. Ajouter un endpoint : `https://votre-domaine.vercel.app/api/stripe/webhook`
3. Sélectionner les événements : `checkout.session.completed`, `checkout.session.expired`
4. Copier le signing secret et le mettre à jour dans Vercel

## 9. Tester en production

1. Aller sur votre URL Vercel
2. Réserver une place en mode test Stripe (carte : `4242 4242 4242 4242`)
3. Vérifier :
   - Email de confirmation reçu
   - Siège marqué comme réservé dans le plan
   - Dashboard admin affiche la réservation

## 10. Passer en mode production Stripe

1. Activer votre compte Stripe (vérification d'identité)
2. Basculer en mode Live
3. Récupérer les nouvelles clés (sans `_test_`)
4. Mettre à jour les variables d'environnement Vercel
5. Reconfigurer le webhook en mode Live

## Troubleshooting

### Le build échoue avec "No database connection string"
- Vérifier que `DATABASE_URL` est bien défini dans `.env.local` (local) ou dans Vercel (production)

### Les emails ne partent pas
- Vérifier que `RESEND_API_KEY` est valide
- Vérifier que `RESEND_FROM_EMAIL` est un domaine vérifié dans Resend

### Le webhook Stripe ne fonctionne pas
- Vérifier que l'URL du webhook est correcte
- Vérifier que `STRIPE_WEBHOOK_SECRET` correspond au webhook configuré
- Tester avec Stripe CLI : `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Les holds ne se libèrent pas
- Le cron Vercel s'exécute toutes les 5 minutes (`/api/cron`) — suffisant pour un hold de 10 minutes ; le nettoyage est aussi déclenché sur les requêtes vers `/api/hold`
- Vérifier que `CRON_SECRET` est configuré en production

### La base Neon ne se met pas en veille (Compute Units élevés)
- Un cron **chaque minute** empêchait l’autosuspend : la config utilise maintenant **toutes les 5 minutes** pour laisser la base inactive entre deux exécutions quand il n’y a pas de trafic
- Éviter d’autres tâches planifiées ou moniteurs qui interrogent la DB en permanence
- Le client `@neondatabase/serverless` avec `neon-http` est adapté (requêtes HTTP sans connexion TCP persistante) ; utilisez l’URL directe du projet dans le dashboard Neon pour `DATABASE_URL`, pas une connexion « toujours active » externe

### Problème de concurrence / double réservation
- Le système utilise `UPDATE ... WHERE status = 'available'` pour garantir l'atomicité
- Si un siège est déjà `held` ou `reserved`, l'UPDATE n'affecte pas la ligne
- Une double vérification post-UPDATE confirme que tous les sièges ont bien été holdés
