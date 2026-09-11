/**
 * Recursos que dependem de migrations do banco isolado permanecem invisíveis
 * até o ambiente remoto confirmar a aplicação e a auditoria correspondentes.
 */
export const quoteDecisionGroupsEnabled = import.meta.env.VITE_QUOTE_DECISION_GROUPS_ENABLED === 'true';
export const customerAdjustmentsEnabled = import.meta.env.VITE_CUSTOMER_ADJUSTMENTS_ENABLED === 'true';
export const persistentSharedSelectionsEnabled = import.meta.env.VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED === 'true';
