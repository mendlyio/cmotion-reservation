# Migrations à lancer à la main

Aucun de ces scripts n'est exécuté par l'application ni par ce dépôt. Valentin les lance sur Neon, dans l'ordre, après une branche de sauvegarde.

La base de production n'a pas été modifiée par le développement de cette branche.

## Ordre

1. Branche Neon de sauvegarde (dashboard), et protection de la branche `main`.
2. `migrations/001_security.sql` — **avant** que le nouveau code reçoive du trafic. Le déploiement Vercel et ce script doivent être coordonnés : sans ces colonnes, la création de réservation et le login admin échouent.
3. `migrations/002_december_events.sql` — crée les 4 spectacles Disney (inactifs, ouverture le 4 novembre 2026 à 19:00 UTC) et désactive les événements 19 à 22 en effaçant leur `open_at`.
4. `migrations/003_wipe_old_reservations.sql` — **seulement** après sauvegarde et accord explicite de Valentin. Il vide les réservations des événements 19 à 22. Il ne s'exécute pas tout seul.

## 001 — sécurité

Fichier : `migrations/001_security.sql`

Ajoute :

- `reservations.public_token` (jeton 128 bits, unique, rempli pour les lignes déjà présentes)
- `reservations.session_id`
- index unique partiel sur `stripe_payment_id` quand il n'est pas vide
- tables `admin_sessions` et `request_limits`

Retour arrière : `migrations/001_security_rollback.sql`, puis redéployer le code précédent. Les jetons déjà envoyés par email deviennent inutiles si on revient en arrière, et l'inverse aussi : les anciens liens `/confirmation/123` ne fonctionnent plus avec le nouveau code.

## Variables

Aucune variable nouvelle n'est à ajouter dans Vercel.

L'origine publique est l'URL du projet : en production `https://$VERCEL_PROJECT_PRODUCTION_URL` (par exemple `https://cmotion-reservation.vercel.app`), en preview `https://$VERCEL_URL`, en local `http://localhost:3000`. Pas de slash final. Les retours Stripe et les liens d'e-mail envoyés en production utilisent cette URL de production stable, jamais l'URL d'un déploiement de preview. `NEXT_PUBLIC_BASE_URL` reste un remplacement facultatif.

`ALERT_EMAIL` est facultatif. Sans cette variable, aucune alerte e-mail n'est envoyée et cela ne produit pas d'erreur.

`VIP_CARLY_EMAIL` seulement si le script manuel `db:vip-carly` est relancé. Les secrets déjà en place (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`) ne changent pas de nom.

## 002 — spectacles de décembre

Fichier : `migrations/002_december_events.sql`

- 4 événements Disney Show, `is_active = false`, `open_at = 2026-11-04 19:00:00` (20h à Bruxelles). Le site les ouvre à cette heure même si le cron a une minute de retard.
- 55 tables et 440 sièges par spectacle, mêmes rangs que le plan actuel. Rangs 1 à 3 en VIP.
- Événements 19 à 22 : `is_active = false` et `open_at` vidé, pour qu'un horaire d'ouverture déjà passé ne les laisse pas réservables.

Ne pas relancer le script : il refuse de continuer si un Disney Show du 5 ou du 6 décembre existe déjà.

Retour arrière : `migrations/002_december_events_rollback.sql`. Il supprime ces quatre spectacles et leurs ventes, puis réactive 21 et 22. 19 et 20 restent inactifs. À n'utiliser avant l'ouverture, ou après restauration d'une sauvegarde.

## 003 — vidage des anciennes réservations

Fichier : `migrations/003_wipe_old_reservations.sql`

Valentin le lance lui-même. Il efface réservations, places, options et blocages des événements 19 à 22, puis remet leurs sièges disponibles. Les spectacles eux-mêmes restent en base, inactifs. Aucun script inverse : la seule marche arrière est la branche de sauvegarde Neon.
