# Migrations à lancer à la main

Aucun de ces scripts n'est exécuté par l'application ni par ce dépôt. Valentin les lance sur Neon, dans l'ordre, après une branche de sauvegarde.

La base de production n'a pas été modifiée par le développement de cette branche.

## Ordre

1. Branche Neon de sauvegarde (dashboard), et protection de la branche `main`.
2. `migrations/001_security.sql` — **avant** que le nouveau code reçoive du trafic. Le déploiement Vercel et ce script doivent être coordonnés : sans ces colonnes, la création de réservation et le login admin échouent.
3. Les scripts du lot spectacles (ajoutés ensuite) : événements de décembre, puis, seulement après sauvegarde et accord explicite, le vidage des anciennes réservations.

## 001 — sécurité

Fichier : `migrations/001_security.sql`

Ajoute :

- `reservations.public_token` (jeton 128 bits, unique, rempli pour les lignes déjà présentes)
- `reservations.session_id`
- index unique partiel sur `stripe_payment_id` quand il n'est pas vide
- tables `admin_sessions` et `request_limits`

Retour arrière : `migrations/001_security_rollback.sql`, puis redéployer le code précédent. Les jetons déjà envoyés par email deviennent inutiles si on revient en arrière, et l'inverse aussi : les anciens liens `/confirmation/123` ne fonctionnent plus avec le nouveau code.

## Variables à poser sur Vercel (aucune valeur dans le dépôt)

- `NEXT_PUBLIC_BASE_URL` = origine publique, sans slash final, par exemple `https://cmotion-reservation.vercel.app`
- `ALERT_EMAIL` = destinataire des alertes paiement et du formulaire d'aide
- `RESEND_FROM_EMAIL` = expéditeur déjà vérifié (plus aucun repli `example.com`)
- `VIP_CARLY_EMAIL` seulement si le script manuel `db:vip-carly` est relancé

Les secrets existants (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`, `CRON_SECRET`, `RESEND_API_KEY`) ne changent pas de nom. Les passer en sensitive et les retirer de Preview et Development se fait dans le dashboard, pas dans le code.
