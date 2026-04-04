/**
 * Utilities for PII (Personally Identifiable Information) masking
 */

/**
 * Masks an email address: dji***@gmail.com
 */
export const maskEmail = (email?: string | null): string => {
  if (!email) return '—';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  if (user.length <= 3) return `***@${domain}`;
  return `${user.substring(0, 3)}***@${domain}`;
};

/**
 * Masks a phone number: +224 62* ** ** 12
 */
export const maskPhone = (phone?: string | null): string => {
  if (!phone) return '—';
  const cleanPhone = phone.trim();
  if (cleanPhone.length < 5) return '***';
  // Keep first 5 chars and last 2 chars
  return `${cleanPhone.substring(0, 6)}* ** ** ${cleanPhone.substring(cleanPhone.length - 2)}`;
};

/**
 * Conditional mask based on role.
 * Returns the original value if the role is authorized (super_admin, admin_central),
 * otherwise returns the masked version.
 */
export const maskIfUnauthorized = (
  value: string | undefined | null,
  role: string | null,
  type: 'email' | 'phone'
): string => {
  const authorizedRoles = ['super_admin', 'admin_etat', 'directeur_general', 'admin_central'];
  const isAuthorized = role && authorizedRoles.includes(role);

  if (isAuthorized) return value || '—';
  
  return type === 'email' ? maskEmail(value) : maskPhone(value);
};
