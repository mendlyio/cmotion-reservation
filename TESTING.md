# Guide de Test - Cmotion Réservation

## Checklist de Test Complet

### 1. Page d'accueil (/)

- [ ] Les 2 événements s'affichent correctement
- [ ] Les dates sont correctes (17 mai 2026 et 7 juin 2026)
- [ ] Les horaires sont visibles
- [ ] Les cartes sont cliquables et redirigent vers `/reservation/[eventId]`

### 2. Plan de salle (/reservation/[eventId])

#### Affichage
- [ ] Le plan SVG s'affiche avec 9 rangées
- [ ] Rangées 1-3 : tables VIP avec bordure dorée
- [ ] Rangées 4-9 : tables normales
- [ ] Chaque table affiche son numéro (ex: "1-3" pour rang 1, table 3)
- [ ] Chaque siège est numéroté de 1 à 8 autour de la table
- [ ] La légende s'affiche (vert, bleu, violet, rouge, doré)

#### Interactions VIP (rangs 1-3)
- [ ] Clic sur une table VIP → sélection des 8 sièges
- [ ] Les sièges deviennent bleus
- [ ] Le formulaire s'affiche à droite avec 8 convives
- [ ] Le countdown timer de 5 minutes apparaît en haut
- [ ] Hover sur la table → tooltip "Table X-Y (VIP) — 280€ pour 8 pers."

#### Interactions normales (rangs 4-9)
- [ ] Clic sur un siège → il devient bleu
- [ ] Clic sur un autre siège de la même table → ajout à la sélection
- [ ] Clic sur un siège d'une autre table → message d'erreur
- [ ] Bouton "Confirmer la sélection" apparaît
- [ ] Clic sur "Confirmer" → hold créé, formulaire s'affiche
- [ ] Countdown timer de 5 minutes apparaît

#### Concurrence (test avec 2 navigateurs)
- [ ] Navigateur A : sélectionne une table VIP
- [ ] Navigateur B : rafraîchit → la table devient violette
- [ ] Navigateur B : hover sur la table → "En cours de réservation"
- [ ] Navigateur B : impossible de cliquer sur la table
- [ ] Navigateur A : abandonne → après 5 min, la table redevient verte
- [ ] Navigateur B : rafraîchit → peut maintenant réserver

### 3. Formulaire de réservation

#### Tables VIP
- [ ] 8 formulaires de convives s'affichent
- [ ] Chaque formulaire : prénom, nom, choix du plat (4 options)
- [ ] Message "VIP : Verre de bulles, zakouski et dessert inclus"
- [ ] Pas de checkbox dessert (inclus)
- [ ] Section Upsells : Repas danseur, Champagne avec +/-
- [ ] Contact : Nom élève référent, Email, Téléphone
- [ ] Récapitulatif : "Table VIP complète (8 pers.) — 280,00€"
- [ ] Total correct : 280€ + upsells

#### Tables normales
- [ ] N formulaires (N = nombre de sièges sélectionnés)
- [ ] Chaque formulaire : prénom, nom, plat, checkbox Tiramisu (+4,50€)
- [ ] Récapitulatif détaillé par convive avec sous-totaux
- [ ] Total correct : somme(repas + desserts) + upsells

#### Validation
- [ ] Bouton "Payer" désactivé si champs vides
- [ ] Tous les champs requis doivent être remplis
- [ ] Email doit être valide

### 4. Paiement

#### Mode test (bouton "Payer (test)")
- [ ] Clic → réservation créée en BDD
- [ ] Redirection vers `/confirmation/[reservationId]`
- [ ] Sièges marqués comme "reserved" en BDD
- [ ] Holds supprimés
- [ ] Email de confirmation envoyé (vérifier boîte mail)

#### Mode Stripe réel (bouton "Payer XX€")
- [ ] Clic → redirection vers Stripe Checkout
- [ ] Carte test : `4242 4242 4242 4242`, date future, CVC 123
- [ ] Paiement réussi → webhook reçu
- [ ] Redirection vers `/confirmation/[reservationId]`
- [ ] Statut "paid" en BDD
- [ ] Sièges réservés
- [ ] Email de confirmation reçu

#### Abandon de paiement
- [ ] Stripe Checkout → clic "Retour"
- [ ] Redirection vers `/reservation/[eventId]?cancelled=true`
- [ ] Après 5 min, les sièges sont libérés automatiquement

### 5. Page de confirmation (/confirmation/[reservationId])

- [ ] Affiche "Réservation confirmée !" si payé
- [ ] Affiche "Paiement en attente" si pending
- [ ] Numéro de réservation visible
- [ ] Détails de l'événement corrects
- [ ] Emplacement (table, sièges) affiché
- [ ] Liste des convives avec repas et desserts
- [ ] Upsells affichés si présents
- [ ] Contact (référent, email, tél)
- [ ] Total correct

### 6. Dashboard admin (/admin)

#### Login
- [ ] Page de login s'affiche
- [ ] Mauvais mot de passe → erreur
- [ ] Bon mot de passe → redirection vers `/admin/dashboard`
- [ ] Cookie de session créé

#### Dashboard principal
- [ ] Stats globales : CA total, taux de remplissage global, nb réservations
- [ ] Section par événement
- [ ] Mini-stats par événement : remplissage, CA, réservations, convives
- [ ] Liste traiteur : compteurs par type de plat + tiramisu
- [ ] Dernières réservations : tableau avec ID, référent, email, montant, statut
- [ ] Bouton "Plan de salle" → `/admin/events/[eventId]`
- [ ] Bouton "Export CSV" → téléchargement CSV

#### Vue événement (/admin/events/[eventId])
- [ ] Plan de salle en lecture seule s'affiche
- [ ] Couleurs reflètent le statut réel (vert/violet/rouge)
- [ ] Section "Détail par table"
- [ ] Chaque table affiche ses convives avec nom, repas, lien vers réservation
- [ ] Tables vides affichent "Aucune réservation"

#### Détail réservation (/admin/reservations/[id])
- [ ] Infos contact affichées
- [ ] Infos paiement : montant, Stripe ID, statut
- [ ] Table et sièges affichés
- [ ] Liste des convives éditable
- [ ] Modification du prénom/nom → sauvegarde
- [ ] Modification du repas → email envoyé au client
- [ ] Ajout/retrait dessert → email envoyé
- [ ] Notes admin éditables
- [ ] Bouton "Sauvegarder et notifier" fonctionne

#### Export CSV
- [ ] Téléchargement du fichier CSV
- [ ] Encodage UTF-8 avec BOM (accents corrects dans Excel)
- [ ] Colonnes : Réservation, Référent, Email, Table, Rang, VIP, Siège, Prénom, Nom, Repas, Dessert, Note Admin
- [ ] Une ligne par convive
- [ ] Données correctes

### 7. Emails (Resend)

#### Email de confirmation
- [ ] Reçu après paiement réussi
- [ ] Sujet : "Confirmation de réservation #X - Cmotion"
- [ ] Design propre avec header gradient
- [ ] Badge "Paiement confirmé"
- [ ] Détails événement : nom, date, horaires, référent
- [ ] Tableau des convives avec repas et desserts
- [ ] Total affiché en gros
- [ ] Footer avec mention "mail automatique"

#### Email de modification
- [ ] Reçu après modification admin avec "Sauvegarder et notifier"
- [ ] Sujet : "Modification de votre réservation #X - Cmotion"
- [ ] Liste des changements effectués
- [ ] Tableau actualisé des convives
- [ ] Design cohérent avec l'email de confirmation

### 8. Système de hold (concurrence)

#### Test avec 2 navigateurs

**Scénario 1 : VIP**
- [ ] Nav A : sélectionne table VIP 1-1
- [ ] Nav B : rafraîchit → table 1-1 devient violette
- [ ] Nav B : hover → "En cours de réservation"
- [ ] Nav B : clic → rien ne se passe (table non cliquable)
- [ ] Nav A : remplit formulaire et paie → table devient rouge
- [ ] Nav B : rafraîchit → table reste rouge (réservée)

**Scénario 2 : Normal**
- [ ] Nav A : sélectionne sièges 1, 2, 3 de table 4-1
- [ ] Nav B : rafraîchit → sièges 1, 2, 3 violets
- [ ] Nav B : peut cliquer sur siège 4 (vert) → sélection OK
- [ ] Nav B : ne peut pas cliquer sur siège 1 (violet)
- [ ] Nav A : abandonne → après 5 min, sièges redeviennent verts
- [ ] Nav B : rafraîchit → peut maintenant sélectionner sièges 1, 2, 3

**Scénario 3 : Expiration**
- [ ] Nav A : sélectionne des sièges
- [ ] Attendre 5 minutes sans rien faire
- [ ] Le countdown atteint 00:00
- [ ] Message "Votre réservation a expiré"
- [ ] Retour au plan de salle
- [ ] Les sièges sont libérés (verts)

**Scénario 4 : Race condition**
- [ ] Nav A et B : cliquent simultanément sur le même siège
- [ ] Un seul doit réussir
- [ ] L'autre doit recevoir "Certains sièges ne sont plus disponibles"

### 9. Polling temps réel

- [ ] Ouvrir 2 navigateurs sur le même événement
- [ ] Nav A : réserve un siège
- [ ] Nav B : après ~10 secondes max, le siège devient violet automatiquement
- [ ] Nav A : paie → siège devient rouge
- [ ] Nav B : après ~10 secondes max, le siège devient rouge automatiquement

### 10. Cron cleanup

- [ ] Créer un hold (sélectionner des sièges)
- [ ] Attendre 5 minutes
- [ ] Vérifier que le nettoyage des holds se fait (après clic accueil + flux réservation, ou `GET /api/cron` avec `CRON_SECRET`)
- [ ] Les sièges redeviennent disponibles même sans rafraîchir la page (via polling)

### 11. Mobile responsive

- [ ] Ouvrir sur mobile/tablette
- [ ] Le plan de salle est scrollable horizontalement
- [ ] Les formulaires s'adaptent en colonne
- [ ] Tous les boutons sont cliquables
- [ ] Le countdown timer reste visible

## Tests de charge (optionnel)

Pour tester la robustesse sous charge :

```bash
# Installer k6
brew install k6

# Créer un script de test
cat > load-test.js <<'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50, // 50 utilisateurs simultanés
  duration: '30s',
};

export default function () {
  // Simuler des réservations concurrentes
  const eventId = 1;
  const res = http.get(`http://localhost:3000/reservation/${eventId}`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
EOF

# Lancer le test
k6 run load-test.js
```

Vérifier :
- [ ] Aucune erreur 500
- [ ] Pas de double réservation dans la BDD
- [ ] Les holds sont correctement gérés
- [ ] Le temps de réponse reste acceptable (<2s)

## Bugs connus à surveiller

- **Hold fantôme** : Sans trafic, le cleanup ne tourne pas → un utilisateur qui charge le plan (`/api/seating`) ou tient une session (`/api/hold`) relance la maintenance ; sinon `GET /api/cron` manuel
- **Race condition** : Avec un très fort trafic, 2 requêtes simultanées pourraient théoriquement passer la vérification → le double-check post-UPDATE devrait empêcher ça
- **Email non reçu** : Vérifier les logs Resend, le domaine d'envoi doit être vérifié
- **Webhook Stripe** : En local, utiliser Stripe CLI pour forward : `stripe listen --forward-to localhost:3000/api/stripe/webhook`
