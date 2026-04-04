/**
 * IP Whitelisting Utility for SIHG
 * 
 * Allows restricting access to administrative dashboards based on user's public IP address.
 */

// WARNING: Set this to false for development to avoid being locked out if your IP changes
// In production, this can be controlled via environment variables or database config
export const IS_IP_WHITELIST_ENABLED = false;

// List of allowed IP addresses or CIDR ranges
// Example: ['197.251.0.0/16', '1.1.1.1']
export const ALLOWED_IP_RANGES = [
  '127.0.0.1', // Localhost
  '::1',       // IPv6 Localhost
  '197.221.72.0/24', // Example range for SONAP HQ (Mock)
];

// Roles that are subject to IP whitelisting (Administrative roles)
export const ADMIN_ROLES_SUBJECT_TO_IP_WHIELISTS = [
  'super_admin',
  'admin_etat',
  'directeur_general',
  'directeur_adjoint',
  'secretariat_direction',
  'service_it',
  'directeur_aval',
  'directeur_adjoint_aval',
  'chef_service_aval',
  'agent_technique_aval',
  'admin_central',
  'chef_regulation',
  'analyste_regulation',
  'inspecteur',
  'agent_terrain',
  'directeur_juridique',
  'juriste',
];

/**
 * Fetches the user's public IP address using a public API
 */
export async function getPublicIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) throw new Error('Failed to fetch IP');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching public IP:', error);
    return null;
  }
}

/**
 * Checks if an IP address matches any of the allowed ranges
 * Simple implementation supporting exact match and basic CIDR (for /24 or /16)
 */
export function isIpAllowed(ip: string | null): boolean {
  if (!IS_IP_WHITELIST_ENABLED) return true;
  if (!ip) return false;

  return ALLOWED_IP_RANGES.some(range => {
    // Exact match
    if (range === ip) return true;

    // Basic CIDR support (/24)
    if (range.endsWith('/24')) {
      const prefix = range.split('/')[0].split('.').slice(0, 3).join('.');
      const ipPrefix = ip.split('.').slice(0, 3).join('.');
      return prefix === ipPrefix;
    }

    // Basic CIDR support (/16)
    if (range.endsWith('/16')) {
      const prefix = range.split('/')[0].split('.').slice(0, 2).join('.');
      const ipPrefix = ip.split('.').slice(0, 2).join('.');
      return prefix === ipPrefix;
    }

    return false;
  });
}
