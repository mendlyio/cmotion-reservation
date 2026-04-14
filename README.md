# Cmotion Réservation

Système de réservation de spectacles avec plan de salle interactif, paiement Stripe, et dashboard admin.

## Stack technique

- **Next.js 15** (App Router) — Vercel
- **Neon** (PostgreSQL) — Drizzle ORM
- **Stripe** — Paiement
- **Resend** — Emails transactionnels
- **Tailwind CSS + shadcn/ui** — UI

## Setup

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local

# Pousser le schéma vers la base de données
npm run db:push

# Seed : créer les 2 événements + 55 tables + 440 sièges
npm run db:seed

# Lancer en développement
npm run dev
```

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | Connection string Neon PostgreSQL |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret du webhook Stripe |
| `RESEND_API_KEY` | Clé API Resend |
| `RESEND_FROM_EMAIL` | Adresse email d'expédition |
| `ADMIN_PASSWORD` | Mot de passe admin |
| `NEXT_PUBLIC_BASE_URL` | URL de base (ex: https://example.com) |

## Fonctionnalités

### Réservation (public)
- Choix du spectacle (+12 ans / -12 ans)
- Plan de salle SVG interactif avec 9 rangées, 55 tables, 440 sièges
- Tables VIP (rangs 1-3) : réservation table entière à 280€
- Tables normales (rangs 4-9) : réservation par siège à partir de 28€
- Hold de 5 minutes avec countdown timer
- Formulaire par convive (nom, prénom, choix du plat, dessert)
- Upsells (repas danseur, champagne)
- Paiement Stripe
- Email de confirmation via Resend

### Dashboard admin (`/admin`)
- Statistiques : CA, taux de remplissage, compteurs
- Plan de salle en lecture seule
- Liste des réservations filtrable
- Modification des repas avec notification email automatique
- Notes admin
- Export CSV (liste traiteur, convives)

### Gestion de la concurrence
- Hold atomique de 5 minutes par session
- Double vérification avec `UPDATE ... WHERE status = 'available'`
- Cleanup automatique des holds expirés (cron Vercel toutes les 5 min + appels `/api/hold`)
- Protection contre les doubles réservations
