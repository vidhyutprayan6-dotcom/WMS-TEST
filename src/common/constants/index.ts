export const HTTP_MESSAGES = {
  TENANT_REQUIRED: 'x-client-id header is required for multi-tenant isolation.',
  TENANT_MISMATCH: 'Request clientId does not match authenticated tenant.',
  USER_REQUIRED: 'x-user-id header is required for audit trail.',
} as const;
