/**
 * Login wajib di production apa pun nilai AUTH_REQUIRED (env yang hilang tidak boleh membuka CMS).
 * Di dev, AUTH_REQUIRED=false tetap membolehkan mode demo tanpa akun.
 */
export const authRequired = process.env.NODE_ENV === "production" || process.env.AUTH_REQUIRED === "true";
