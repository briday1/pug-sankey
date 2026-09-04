export const ADDITIONAL_DEMOS = [
  {
    name: "Energy flow",
    pug: `// Demo 1 — energy flow from generation through carriers to end use
.background #ffffff
.font Inter
.node-labels show
.node-values show
.flow-values show
.blend 60

node
  .id coal
  .label Coal
  .color #57534e
node
  .id natural-gas
  .label Natural gas
  .color #f59e0b
node
  .id renewables
  .label Renewables
  .color #22c55e
node
  .id nuclear
  .label Nuclear
  .color #a855f7
node
  .id electricity
  .label Electricity
  .color #2563eb
node
  .id heat
  .label Heat
  .color #ef4444
node
  .id fuels
  .label Fuels
  .color #0ea5e9
node
  .id homes
  .label Homes
  .color #f97316
node
  .id industry
  .label Industry
  .color #64748b
  .annotation
    .above
      | Largest single consumer
node
  .id transport
  .label Transport
  .color #14b8a6

flow
  .from coal
  .to electricity
  .value 28
flow
  .from coal
  .to heat
  .value 8
flow
  .from coal
  .to fuels
  .value 4
flow
  .from natural-gas
  .to electricity
  .value 22
flow
  .from natural-gas
  .to heat
  .value 14
flow
  .from natural-gas
  .to fuels
  .value 9
flow
  .from renewables
  .to electricity
  .value 30
  .color #16a34a
flow
  .from nuclear
  .to electricity
  .value 15
flow
  .from electricity
  .to homes
  .value 35
flow
  .from electricity
  .to industry
  .value 40
flow
  .from electricity
  .to transport
  .value 20
flow
  .from heat
  .to homes
  .value 12
flow
  .from heat
  .to industry
  .value 10
flow
  .from fuels
  .to transport
  .value 9
flow
  .from fuels
  .to industry
  .value 4`,
    css: ""
  },
  {
    name: "Website traffic funnel",
    pug: `// Demo 2 — website traffic funnel: visits through channels and pages to conversions (thousands)
.background #fafaf9
.font Verdana
.node-labels show
.node-values show
.flow-labels show
.flow-values show
.blend 55

node
  .id visits
  .label Visits
  .color #2563eb
node
  .id organic
  .label Organic
  .color #22c55e
node
  .id paid
  .label Paid
  .color #f59e0b
node
  .id social
  .label Social
  .color #ec4899
node
  .id email
  .label Email
  .color #8b5cf6
node
  .id landing
  .label Landing
  .color #0ea5e9
node
  .id docs
  .label Docs
  .color #14b8a6
node
  .id pricing
  .label Pricing
  .color #f97316
node
  .id signup
  .label Signup
  .color #16a34a
node
  .id bounce
  .label Bounce
  .color #94a3b8

flow
  .from visits
  .to organic
  .value 46
  .label search
flow
  .from visits
  .to paid
  .value 22
  .label ads
flow
  .from visits
  .to social
  .value 18
  .label shares
flow
  .from visits
  .to email
  .value 14
  .label campaigns
flow
  .from organic
  .to landing
  .value 26
flow
  .from organic
  .to docs
  .value 12
flow
  .from organic
  .to pricing
  .value 8
flow
  .from paid
  .to landing
  .value 14
flow
  .from paid
  .to pricing
  .value 8
flow
  .from social
  .to landing
  .value 10
flow
  .from social
  .to docs
  .value 5
flow
  .from social
  .to pricing
  .value 3
flow
  .from email
  .to landing
  .value 6
flow
  .from email
  .to docs
  .value 3
flow
  .from email
  .to pricing
  .value 5
flow
  .from landing
  .to signup
  .value 20
  .label convert
flow
  .from landing
  .to bounce
  .value 36
  .label leave
flow
  .from docs
  .to signup
  .value 6
flow
  .from docs
  .to bounce
  .value 14
flow
  .from pricing
  .to signup
  .value 18
flow
  .from pricing
  .to bounce
  .value 6`,
    css: ""
  },
  {
    name: "Household budget",
    pug: `// Demo 3 — household budget: income streams through accounts to spending (hundreds of dollars)
.background #f8fafc
.node-labels show
.node-values show
.flow-values show
.blend 65

node
  .id salary
  .label Salary
  .color #16a34a
node
  .id freelance
  .label Freelance
  .color #22c55e
node
  .id investments
  .label Investments
  .color #84cc16
node
  .id checking
  .label Checking
  .color #2563eb
node
  .id savings
  .label Savings
  .color #0ea5e9
  .annotation
    .below
      | Roughly 20% of income
node
  .id housing
  .label Housing
  .color #f97316
node
  .id food
  .label Food
  .color #eab308
node
  .id transport
  .label Transport
  .color #14b8a6
node
  .id leisure
  .label Leisure
  .color #ec4899
node
  .id subscriptions
  .label Subscriptions
  .color #a855f7
node
  .id travel
  .label Travel
  .color #06b6d4

flow
  .from salary
  .to checking
  .value 52
flow
  .from salary
  .to savings
  .value 16
flow
  .from freelance
  .to checking
  .value 9
flow
  .from freelance
  .to savings
  .value 3
flow
  .from investments
  .to checking
  .value 4
flow
  .from investments
  .to savings
  .value 6
flow
  .from checking
  .to housing
  .value 24
flow
  .from checking
  .to food
  .value 13
flow
  .from checking
  .to transport
  .value 9
flow
  .from checking
  .to leisure
  .value 10
flow
  .from checking
  .to subscriptions
  .value 9
flow
  .from savings
  .to travel
  .value 10
flow
  .from savings
  .to housing
  .value 8
flow
  .from savings
  .to leisure
  .value 7`,
    css: ""
  },
  {
    name: "Supply chain",
    pug: `// Demo 4 — supply chain: raw materials through plants and products to markets (tonnes per week)
.background #fffbeb
.font Georgia
.node-labels show
.node-values show
.flow-values show
.blend 50

node
  .id steel
  .label Steel
  .color #6b7280
node
  .id polymer
  .label Polymer
  .color #06b6d4
node
  .id cotton
  .label Cotton
  .color #f472b6
node
  .id glass
  .label Glass
  .color #94a3b8
node
  .id components
  .label Component plant
  .color #f59e0b
node
  .id assembly
  .label Assembly plant
  .color #fb923c
node
  .id apparel-mill
  .label Apparel mill
  .color #db2777
node
  .id packaging
  .label Packaging plant
  .color #65a30d
node
  .id appliances
  .label Appliances
  .color #2563eb
node
  .id apparel
  .label Apparel
  .color #ec4899
node
  .id containers
  .label Containers
  .color #84cc16
node
  .id domestic
  .label Domestic
  .color #22c55e
node
  .id export
  .label Export
  .color #8b5cf6

flow
  .from steel
  .to components
  .value 18
  .color #475569
flow
  .from steel
  .to assembly
  .value 12
flow
  .from polymer
  .to components
  .value 14
flow
  .from polymer
  .to packaging
  .value 16
flow
  .from cotton
  .to apparel-mill
  .value 20
flow
  .from glass
  .to packaging
  .value 10
flow
  .from glass
  .to components
  .value 4
flow
  .from components
  .to assembly
  .value 36
flow
  .from assembly
  .to appliances
  .value 48
flow
  .from apparel-mill
  .to apparel
  .value 20
flow
  .from packaging
  .to containers
  .value 26
flow
  .from appliances
  .to domestic
  .value 28
flow
  .from appliances
  .to export
  .value 20
flow
  .from apparel
  .to domestic
  .value 9
flow
  .from apparel
  .to export
  .value 11
flow
  .from containers
  .to domestic
  .value 16
flow
  .from containers
  .to export
  .value 10`,
    css: ""
  },
  {
    name: "Data pipeline",
    pug: `// Demo 5 — data pipeline: sources through ingestion and storage to analytics, with a model feedback loop (TB/day)
.background #f0f9ff
.node-labels show
.node-values show
.flow-labels show
.flow-values show
.blend 45

node
  .id sensors
  .label Sensors
  .color #0ea5e9
node
  .id app-logs
  .label App logs
  .color #8b5cf6
node
  .id crm
  .label CRM
  .color #ec4899
node
  .id collectors
  .label Collectors
  .color #f59e0b
node
  .id etl
  .label ETL jobs
  .color #f97316
node
  .id data-lake
  .label Data lake
  .color #2563eb
node
  .id warehouse
  .label Warehouse
  .color #0d9488
node
  .id dashboards
  .label Dashboards
  .color #22c55e
node
  .id ml-models
  .label ML models
  .color #a855f7
node
  .id actions
  .label Actions
  .color #ef4444

flow
  .from sensors
  .to collectors
  .value 30
flow
  .from app-logs
  .to collectors
  .value 24
flow
  .from crm
  .to etl
  .value 18
flow
  .from collectors
  .to data-lake
  .value 40
flow
  .from collectors
  .to warehouse
  .value 14
flow
  .from etl
  .to warehouse
  .value 18
flow
  .from data-lake
  .to ml-models
  .value 22
  .label training
flow
  .from data-lake
  .to dashboards
  .value 18
flow
  .from warehouse
  .to dashboards
  .value 20
flow
  .from warehouse
  .to ml-models
  .value 12
flow
  .from ml-models
  .to actions
  .value 26
  .label predictions
flow
  .from ml-models
  .to collectors
  .value 8
  .label sampling rules
  .color #dc2626`,
    css: ""
  },
  {
    name: "Water distribution",
    pug: `// Demo 6 — water resources: sources through treatment and mains to consumption and losses (million litres per day)
.background #eff6ff
.node-labels show
.node-values show
.flow-values show
.blend 55

node
  .id reservoir
  .label Reservoir
  .color #2563eb
node
  .id groundwater
  .label Groundwater
  .color #0ea5e9
node
  .id recycled
  .label Recycled
  .color #14b8a6
node
  .id treatment
  .label Treatment plant
  .color #f59e0b
node
  .id city-mains
  .label City mains
  .color #8b5cf6
node
  .id households
  .label Households
  .color #22c55e
node
  .id farms
  .label Farms
  .color #84cc16
node
  .id industry
  .label Industry
  .color #64748b
node
  .id losses
  .label Losses
  .color #ef4444
  .annotation
    .above
      | Leaks and evaporation

flow
  .from reservoir
  .to treatment
  .value 42
flow
  .from groundwater
  .to treatment
  .value 18
flow
  .from groundwater
  .to farms
  .value 8
flow
  .from recycled
  .to industry
  .value 6
flow
  .from recycled
  .to farms
  .value 4
flow
  .from treatment
  .to city-mains
  .value 50
flow
  .from treatment
  .to industry
  .value 10
flow
  .from city-mains
  .to households
  .value 34
flow
  .from city-mains
  .to industry
  .value 8
flow
  .from city-mains
  .to losses
  .value 8`,
    css: ""
  },
  {
    name: "Support tickets",
    pug: `// Demo 7 — support tickets: intake channels through triage and teams to resolution or escalation (tickets per week)
.background #fdf4ff
.node-labels show
.node-values show
.flow-values show
.blend 60

node
  .id email
  .label Email
  .color #2563eb
node
  .id chat
  .label Live chat
  .color #0ea5e9
node
  .id phone
  .label Phone
  .color #f59e0b
node
  .id social
  .label Social
  .color #ec4899
node
  .id triage
  .label Triage
  .color #8b5cf6
node
  .id support-l1
  .label Support L1
  .color #22c55e
node
  .id billing
  .label Billing
  .color #eab308
node
  .id engineering
  .label Engineering
  .color #64748b
node
  .id resolved
  .label Resolved
  .color #16a34a
node
  .id escalated
  .label Escalated
  .color #ef4444

flow
  .from email
  .to triage
  .value 38
flow
  .from chat
  .to triage
  .value 27
flow
  .from phone
  .to triage
  .value 21
flow
  .from social
  .to triage
  .value 14
flow
  .from triage
  .to support-l1
  .value 52
flow
  .from triage
  .to billing
  .value 26
flow
  .from triage
  .to engineering
  .value 22
flow
  .from support-l1
  .to resolved
  .value 48
flow
  .from support-l1
  .to engineering
  .value 4
flow
  .from billing
  .to resolved
  .value 24
flow
  .from billing
  .to engineering
  .value 2
flow
  .from engineering
  .to resolved
  .value 20
flow
  .from engineering
  .to escalated
  .value 8`,
    css: ""
  },
  {
    name: "Minimal Sankey",
    pug: `// Demo 8 — the smallest Sankey diagram: three nodes and two flows.
// Grammar: optional canvas settings such as .background, .font,
// .node-labels/.node-values/.flow-labels/.flow-values (show|hide) and
// .blend (0-100), then node blocks with .id/.label/.color, then flow
// blocks with .from/.to/.value plus optional .color and .label.
// Values size both ribbon thickness and node bar heights.
node
  .id input
  .label Input
node
  .id alpha
  .label Alpha
node
  .id beta
  .label Beta
flow
  .from input
  .to alpha
  .value 60
flow
  .from input
  .to beta
  .value 40`,
    css: ""
  }
];
