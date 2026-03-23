# Quick Start - Cmotion Réservation

## État actuel

✅ **Projet complètement implémenté et fonctionnel**

- 62 fichiers créés (~5800 lignes de code)
- Base de données initialisée avec 2 événements, 110 tables, 880 sièges
- Serveur de développement opérationnel sur http://localhost:3000
- Code pushé sur GitHub : https://github.com/mendlyio/cmotion-reservation

## Tester localement (maintenant)

Le serveur dev tourne déjà. Ouvrez votre navigateur :

1. **Page d'accueil** : http://localhost:3000
   - Voir les 2 spectacles
   - Cliquer pour réserver

2. **Réservation** : http://localhost:3000/reservation/1
   - Voir le plan de salle interactif
   - Cliquer sur une table VIP ou des sièges normaux
   - Remplir le formulaire
   - Utiliser le bouton "Payer (test)" pour simuler un paiement

3. **Admin** : http://localhost:3000/admin
   - Mot de passe : `admin123`
   - Voir le dashboard avec stats
   - Explorer les réservations

## Configuration requise avant production

### 1. Stripe (obligatoire)
```bash
# Aller sur https://stripe.com
# Créer un compte → Mode test
# Récupérer les clés dans Developers → API keys
```

Mettre à jour dans `.env.local` :
```
STRIPE_SECRET_KEY=sk_test_votre_cle_reelle
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_reelle
```

### 2. Resend (obligatoire)
```bash
# Aller sur https://resend.com
# Créer un compte → Créer une API key
```

Mettre à jour dans `.env.local` :
```
RESEND_API_KEY=re_votre_cle_reelle
RESEND_FROM_EMAIL=noreply@cmotionstudio.be
```

### 3. Webhook Stripe (pour production)
```bash
# En local, utiliser Stripe CLI :
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copier le webhook secret affiché
# Le mettre dans .env.local :
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Déployer sur Vercel

### Option 1 : Via l'interface

1. Aller sur https://vercel.com
2. "Import Project" → Sélectionner le repo GitHub
3. Ajouter les variables d'environnement (copier depuis `.env.local`)
4. Déployer

### Option 2 : Via CLI

```bash
npm i -g vercel
vercel login
vercel --prod

# Ajouter les variables d'environnement une par une :
vercel env add DATABASE_URL
vercel env add STRIPE_SECRET_KEY
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL
vercel env add ADMIN_PASSWORD
vercel env add NEXT_PUBLIC_BASE_URL
vercel env add CRON_SECRET
```

### Après le déploiement

1. **Configurer le webhook Stripe** :
   - Dashboard Stripe → Developers → Webhooks
   - Ajouter : `https://votre-domaine.vercel.app/api/stripe/webhook`
   - Événements : `checkout.session.completed`, `checkout.session.expired`
   - Copier le signing secret → Mettre à jour `STRIPE_WEBHOOK_SECRET` dans Vercel

2. **Tester** :
   - Faire une réservation test avec carte `4242 4242 4242 4242`
   - Vérifier l'email de confirmation
   - Vérifier le dashboard admin

## Structure des fichiers

```
src/
├── app/
│   ├── page.tsx                          # Accueil
│   ├── reservation/[eventId]/            # Plan + formulaire
│   ├── confirmation/[reservationId]/     # Confirmation
│   ├── admin/                            # Dashboard admin
│   └── api/                              # 11 endpoints API
├── components/
│   ├── seating/                          # Plan de salle SVG
│   ├── booking/                          # Formulaires
│   └── ui/                               # shadcn/ui
├── lib/
│   ├── db/                               # Drizzle ORM + seed
│   ├── stripe.ts, resend.ts, admin.ts
│   ├── hold.ts                           # Système de hold
│   └── session.ts                        # Gestion session
├── emails/                               # Templates HTML
└── types/                                # Types TypeScript

DEPLOYMENT.md  → Guide de déploiement complet
TESTING.md     → Checklist de test
FEATURES.md    → Liste des fonctionnalités
README.md      → Documentation technique
```

## Commandes utiles

```bash
npm run dev              # Lancer en développement
npm run build            # Build production
npm run db:push          # Pousser le schéma vers Neon
npm run db:seed          # Seed la base de données
npm run db:studio        # Ouvrir Drizzle Studio (GUI)
npm run lint             # Linter
```

## Aide

- **Build échoue** : Vérifier que `DATABASE_URL` est défini
- **Emails non reçus** : Vérifier `RESEND_API_KEY` et le domaine d'envoi
- **Webhook ne marche pas** : Utiliser Stripe CLI en local
- **Double réservation** : Vérifier les logs, le système devrait l'empêcher

## Support

- Documentation : Voir `DEPLOYMENT.md`, `FEATURES.md`, `TESTING.md`
- GitHub : https://github.com/mendlyio/cmotion-reservation
- Issues : Ouvrir une issue sur GitHub si problème
