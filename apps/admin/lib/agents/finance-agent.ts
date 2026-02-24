import type { AgentConfig } from "./types";

export const financeAgent: AgentConfig = {
  slug: "finance-agent",
  name: "Finance Agent",
  description:
    "Financial operations specialist. Handles revenue analytics, collections, reconciliation, owner statements, expense categorization, and financial compliance.",
  systemPrompt: `You are the Finance Agent for Casaora, a property-management platform in Paraguay. You manage all financial operations and reporting.

Your capabilities:
1. REVENUE: Analyze RevPAN, ADR, occupancy rates, and total revenue trends.
2. COLLECTIONS: Track outstanding payments, reconcile collections, flag delinquencies.
3. STATEMENTS: Generate owner statements with proper IVA (10%) calculations.
4. EXPENSES: Categorize expenses, allocate to properties/units, detect anomalies.
5. RECONCILIATION: Match bank transactions to expected payments.
6. COMPLIANCE: Check lease financial terms, IVA compliance, regulatory requirements.
7. FORECASTING: Revenue projections, expense trends, anomaly alerts.

Decision rules:
- All financial calculations must include IVA (10%) for Paraguay.
- Currency is PYG (Paraguayan Guaraní) unless the property uses USD.
- Flag discrepancies > 5% between expected and actual collections.
- Owner statements should reconcile to the penny.
- For bulk financial operations, present a summary before executing.`,
  maxSteps: 8,
  mutationTools: [
    "create_row",
    "update_row",
    "generate_owner_statement",
    "reconcile_collections",
    "categorize_expense",
    "apply_pricing_recommendation",
    "fetch_market_data",
    "auto_reconcile_all",
    "import_bank_transactions",
    "auto_reconcile_batch",
    "handle_split_payment",
  ],
  allowedTools: [
    "list_tables",
    "get_org_snapshot",
    "list_rows",
    "get_row",
    "create_row",
    "update_row",
    "get_revenue_analytics",
    "get_seasonal_demand",
    "get_collections_risk",
    "get_owner_statement_summary",
    "get_anomaly_alerts",
    "generate_owner_statement",
    "reconcile_collections",
    "categorize_expense",
    "auto_reconcile_all",
    "generate_pricing_recommendations",
    "apply_pricing_recommendation",
    "fetch_market_data",
    "simulate_rate_impact",
    "get_portfolio_kpis",
    "get_property_comparison",
    "simulate_investment_scenario",
    "get_portfolio_trends",
    "get_property_heatmap",
    "generate_performance_digest",
    "simulate_renovation_roi",
    "simulate_stress_test",
    "import_bank_transactions",
    "auto_reconcile_batch",
    "handle_split_payment",
    "check_lease_compliance",
    "check_document_expiry",
    "get_risk_radar",
    "forecast_demand",
    "recall_memory",
    "store_memory",
    "create_execution_plan",
    "search_knowledge",
  ],
};
