/** Cookie posé après clic sur l’accueil : évite de réveiller Neon pour crawlers / préchargements sans interaction. */
export const RESERVATION_ENTRY_COOKIE = "cmotion_db_ready";
/** 7 jours — même navigateur sans re-cliquer à chaque visite. */
export const RESERVATION_ENTRY_MAX_AGE_SEC = 60 * 60 * 24 * 7;
