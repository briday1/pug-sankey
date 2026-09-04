export const ADDITIONAL_DEMOS = [
  {
    name: "Hiring pipeline",
    pug: `// Demo 2 — a candidate journey with branching hiring outcomes
.background #fff7ed
.defaults
  flow
    .color #c2410c
    .width 2
    .arrow-style forward

graph
  .id hiring
  .label Hiring pipeline
  .label-position inside
  .fill #ffffff
  .outline #fed7aa
  .outline-width 2
  .padding 34
  .x-spacing 58
  .y-spacing 46
  node
    .candidate
    .id apply
    .label Apply
  node
    .candidate
    .id screen
    .label Portfolio review
  node
    .decision
    .id interview
    .label Team interview
  node
    .declined
    .id archive
    .label Close application
  node
    .success
    .id offer
    .label Offer
  node
    .candidate
    .id talent
    .label Talent community
  node
    .candidate
    .id references
    .label Reference checks
  node
    .success
    .id onboarding
    .label Onboarding
  flow
    .from apply
    .to screen
    .direction down
  flow
    .from screen
    .to interview
    .direction right
    .annotation-above advance
  flow
    .from screen
    .to archive
    .direction left
    .annotation-above not now
  flow
    .from archive
    .to talent
    .direction down
  flow
    .from interview
    .to references
    .direction down
    .annotation-above great match
  flow
    .from references
    .to offer
    .direction right
  flow
    .from references
    .to talent
    .direction left
    .stroke-style dashed
    .annotation-above keep warm
  flow
    .from offer
    .to onboarding
    .direction down`,
    css: `@node candidate {
  shape: rounded;
  fill: #ffedd5;
  color: #9a3412;
  outline: #fb923c;
  width: 132;
  shadow-color: #9a3412;
  shadow-offset-y: 4;
  shadow-blur: 12;
  shadow-opacity: 0.14;
}

@node decision {
  shape: hexagon;
  fill: #f97316;
  color: #ffffff;
  outline: #c2410c;
  width: 142;
}

@node success {
  shape: pill;
  fill: #15803d;
  color: #ffffff;
  outline: #166534;
  width: 120;
}

@node declined {
  shape: rounded;
  fill: #f1f5f9;
  color: #475569;
  outline: #94a3b8;
  outline-style: dashed;
  width: 132;
}`
  },
  {
    name: "Forest adventure",
    pug: `// Demo 3 — a branching choose-your-own-adventure map
.background #f0fdf4
.defaults
  flow
    .color #166534
    .width 2
    .arrow-style forward
    .roundness 12

graph
  .id adventure
  .label The whispering forest
  .label-position inside
  .fill #dcfce7
  .outline #86efac
  .padding 38
  .x-spacing 72
  .y-spacing 46
  node
    .scene
    .id trail
    .label Moonlit trail
  node
    .choice
    .id fork
    .label Follow which sound?
  node
    .danger
    .id cave
    .label Dragon cave
  node
    .wonder
    .id river
    .label Singing river
  node
    .ending
    .id treasure
    .label Hidden crown
  node
    .ending
    .id village
    .label Lantern village
  node
    .scene
    .id tower
    .label Mossy watchtower
  node
    .danger
    .id wolves
    .label Wolf crossing
  node
    .wonder
    .id waterfall
    .label Silver waterfall
  node
    .choice
    .id bridge
    .label Cross the old bridge?
  node
    .scene
    .id ruins
    .label Sunken ruins
  node
    .wonder
    .id owl
    .label Owl oracle
  node
    .ending
    .id sanctuary
    .label Starlight sanctuary
  node
    .danger
    .id thorns
    .label Sleeping thorns
  node
    .ending
    .id home
    .label Dawn road home
  flow
    .from trail
    .to fork
    .direction down
  flow
    .from fork
    .to cave
    .direction left
    .annotation-above roar
  flow
    .from fork
    .to river
    .direction right
    .annotation-above melody
  flow
    .from cave
    .to treasure
    .direction down
  flow
    .from river
    .to village
    .direction down
  flow
    .from cave
    .to tower
    .direction left
    .annotation-above climb
  flow
    .from cave
    .to wolves
    .direction right
    .annotation-above flee
  flow
    .from river
    .to waterfall
    .direction right
  flow
    .from river
    .to bridge
    .direction left
  flow
    .from tower
    .to ruins
    .direction down
  flow
    .from wolves
    .to ruins
    .direction down
  flow
    .from waterfall
    .to owl
    .direction down
  flow
    .from bridge
    .to thorns
    .direction down
  flow
    .from ruins
    .to sanctuary
    .direction down
  flow
    .from owl
    .to sanctuary
    .direction left
  flow
    .from thorns
    .to home
    .direction down
  flow
    .from sanctuary
    .to home
    .direction right`,
    css: `@node scene {
  shape: pill;
  fill: #14532d;
  color: #ffffff;
  width: 142;
}

@node choice {
  shape: diamond;
  fill: #fef3c7;
  color: #78350f;
  outline: #d97706;
  width: 160;
}

@node danger {
  shape: hexagon;
  fill: #7f1d1d;
  color: #fee2e2;
  outline: #ef4444;
  width: 135;
}

@node wonder {
  shape: rounded;
  fill: #0e7490;
  color: #ecfeff;
  outline: #22d3ee;
  width: 135;
}

@node ending {
  shape: pill;
  fill: #fbbf24;
  color: #422006;
  outline: #d97706;
  width: 135;
}`
  },
  {
    name: "Espresso recipe",
    pug: `// Demo 4 — a compact recipe card for the perfect espresso
.background #faf5ff
.defaults
  flow
    .color #7e22ce
    .width 2
    .arrow-style forward

graph
  .id espresso
  .label Espresso in four moves
  .label-position inside
  .fill #ffffff
  .outline #d8b4fe
  .outline-width 2
  .padding 34
  .x-spacing 54
  node
    .ingredient
    .id beans
    .label
      | 18 g
      | fresh beans
  node
    .step
    .id grind
    .label Fine grind
  node
    .step
    .id tamp
    .label Level + tamp
  node
    .brew
    .id extract
    .label
      | 36 g out
      | in 28 seconds
    .annotation
      .below
        | Sweet, balanced, silky
  flow
    .from beans
    .to grind
    .direction right
  flow
    .from grind
    .to tamp
    .direction right
  flow
    .from tamp
    .to extract
    .direction right`,
    css: `@node ingredient {
  shape: round;
  fill: #3f1d0b;
  color: #fef3c7;
  outline: #a16207;
  width: 110;
  height: 110;
}

@node step {
  shape: rounded;
  fill: #f3e8ff;
  color: #581c87;
  outline: #c084fc;
  width: 125;
}

@node brew {
  shape: pill;
  fill: #7e22ce;
  color: #ffffff;
  outline: #581c87;
  width: 145;
}`
  },
  {
    name: "Family tree",
    pug: `// Demo 5 — a small family tree with generations kept clear
.background #fdf2f8
.defaults
  node
    .font-family Georgia, serif
  flow
    .color #be185d
    .width 1.5
    .arrow-style none

graph
  .id family
  .label Three generations
  .label-position inside
  .fill #ffffff
  .outline #f9a8d4
  .padding 38
  .x-spacing 62
  .y-spacing 54
  node
    .elder
    .id evelyn
    .label Evelyn
  node
    .elder
    .id arthur
    .label Arthur
  node
    .parent
    .id maya
    .label Maya
  node
    .parent
    .id theo
    .label Theo
  node
    .child
    .id iris
    .label Iris
  node
    .child
    .id leo
    .label Leo
  node
    .parent
    .id nadia
    .label Nadia
  node
    .child
    .id june
    .label June
  node
    .child
    .id miles
    .label Miles
  node
    .child
    .id zoe
    .label Zoe
  flow
    .from evelyn
    .to maya
    .direction down
  flow
    .from arthur
    .to maya
    .direction down
  flow
    .from evelyn
    .to theo
    .direction down
  flow
    .from arthur
    .to theo
    .direction down
  flow
    .from maya
    .to iris
    .direction down
  flow
    .from maya
    .to leo
    .direction down
  flow
    .from evelyn
    .to nadia
    .direction down
  flow
    .from arthur
    .to nadia
    .direction down
  flow
    .from theo
    .to june
    .direction down
  flow
    .from theo
    .to miles
    .direction down
  flow
    .from nadia
    .to miles
    .direction down
  flow
    .from nadia
    .to zoe
    .direction down`,
    css: `@node elder {
  shape: pill;
  fill: #831843;
  color: #ffffff;
  outline: #500724;
  width: 118;
}

@node parent {
  shape: rounded;
  fill: #fbcfe8;
  color: #831843;
  outline: #ec4899;
  width: 118;
}

@node child {
  shape: round;
  fill: #fce7f3;
  color: #9d174d;
  outline: #f472b6;
  width: 92;
  height: 92;
}`
  },
  {
    name: "Product roadmap",
    pug: `// Demo 6 — a roadmap with parallel product workstreams
.background #eff6ff
.defaults
  flow
    .color #2563eb
    .width 3
    .arrow-style forward
    .roundness 0

graph
  .id roadmap
  .label 2026 product roadmap
  .label-position inside
  .fill #ffffff
  .outline #93c5fd
  .outline-width 2
  .padding 38
  .x-spacing 62
  .y-spacing 52
  node
    .shipped
    .id q1
    .label
      | Q1
      | Foundations
    .annotation
      .below Auth + design system
  node
    .active
    .id q2
    .label
      | Q2
      | Collaboration
    .annotation
      .above NOW
  node
    .planned
    .id automations
    .label
      | Q3
      | Automations
  node
    .planned
    .id mobile
    .label
      | Q3
      | Mobile
  node
    .planned
    .id integrations
    .label
      | Q3
      | Integrations
  node
    .future
    .id q4
    .label
      | Q4
      | Intelligence
  node
    .planned
    .id permissions
    .label Granular permissions
  node
    .planned
    .id comments
    .label Threaded comments
  node
    .planned
    .id templates
    .label Workflow templates
  node
    .planned
    .id triggers
    .label Event triggers
  node
    .planned
    .id ios
    .label iOS client
  node
    .planned
    .id android
    .label Android client
  node
    .planned
    .id slack
    .label Slack integration
  node
    .planned
    .id github
    .label GitHub integration
  node
    .future
    .id assistant
    .label Project assistant
  node
    .future
    .id forecasting
    .label Delivery forecasting
  node
    .future
    .id search
    .label Semantic search
  node
    .shipped
    .id telemetry
    .label Product telemetry
  flow
    .from q1
    .to q2
    .direction down
  flow
    .from q2
    .to automations
    .direction left
  flow
    .from q2
    .to mobile
    .direction down
  flow
    .from q2
    .to integrations
    .direction right
  flow
    .from automations
    .to q4
    .direction down
    .stroke-style dashed
  flow
    .from mobile
    .to q4
    .direction down
    .stroke-style dashed
  flow
    .from integrations
    .to q4
    .direction down
    .stroke-style dashed
  flow
    .from q2
    .to permissions
    .direction left
  flow
    .from q2
    .to comments
    .direction right
  flow
    .from automations
    .to templates
    .direction left
  flow
    .from automations
    .to triggers
    .direction right
  flow
    .from mobile
    .to ios
    .direction left
  flow
    .from mobile
    .to android
    .direction right
  flow
    .from integrations
    .to slack
    .direction left
  flow
    .from integrations
    .to github
    .direction right
  flow
    .from templates
    .to assistant
    .direction down
    .stroke-style dashed
  flow
    .from triggers
    .to assistant
    .direction down
    .stroke-style dashed
  flow
    .from ios
    .to forecasting
    .direction down
    .stroke-style dashed
  flow
    .from android
    .to forecasting
    .direction down
    .stroke-style dashed
  flow
    .from slack
    .to search
    .direction down
    .stroke-style dashed
  flow
    .from github
    .to search
    .direction down
    .stroke-style dashed
  flow
    .from telemetry
    .to q2
    .direction right
  flow
    .from assistant
    .to q4
    .direction right
  flow
    .from forecasting
    .to q4
    .direction down
  flow
    .from search
    .to q4
    .direction left`,
    css: `@node shipped {
  shape: rounded;
  fill: #dbeafe;
  color: #1e3a8a;
  outline: #60a5fa;
  width: 140;
}

@node active {
  shape: rounded;
  fill: #2563eb;
  color: #ffffff;
  outline: #1d4ed8;
  outline-width: 3;
  width: 145;
  shadow-color: #1d4ed8;
  shadow-offset-y: 5;
  shadow-blur: 14;
  shadow-opacity: 0.24;
}

@node planned {
  shape: rounded;
  fill: #ffffff;
  color: #1d4ed8;
  outline: #60a5fa;
  width: 140;
}

@node future {
  shape: rounded;
  fill: #f8fafc;
  color: #64748b;
  outline: #94a3b8;
  outline-style: dashed;
  width: 140;
}`
  },
  {
    name: "Water cycle",
    pug: `// Demo 7 — a classroom-ready water cycle
.background #ecfeff
.defaults
  flow
    .color #0891b2
    .width 2.5
    .arrow-style forward
    .roundness 18

graph
  .id water-cycle
  .label The water cycle
  .label-position inside
  .fill #cffafe
  .outline #67e8f9
  .padding 44
  .x-spacing 76
  .y-spacing 56
  node
    .ocean
    .id ocean
    .label Ocean
  node
    .sky
    .id vapor
    .label Water vapor
  node
    .cloud
    .id clouds
    .label Clouds
  node
    .rain
    .id rain
    .label Precipitation
  node
    .land
    .id runoff
    .label Rivers + runoff
  node
    .land
    .id groundwater
    .label Groundwater
  node
    .land
    .id glacier
    .label Glaciers
  node
    .sky
    .id plants
    .label Plant vapor
  node
    .cloud
    .id snow
    .label Snow clouds
  flow
    .from ocean
    .to vapor
    .direction up
    .annotation-above evaporation
  flow
    .from vapor
    .to clouds
    .direction right
    .annotation-above condensation
  flow
    .from clouds
    .to rain
    .direction down
  flow
    .from rain
    .to runoff
    .direction down
    .annotation-above collection
  flow
    .from runoff
    .to ocean
    .direction left
  flow
    .from rain
    .to groundwater
    .direction right
    .annotation-above infiltration
  flow
    .from groundwater
    .to ocean
    .direction left
  flow
    .from runoff
    .to plants
    .direction right
    .annotation-above transpiration
  flow
    .from plants
    .to clouds
    .direction up
  flow
    .from clouds
    .to snow
    .direction right
  flow
    .from snow
    .to glacier
    .direction down
  flow
    .from glacier
    .to runoff
    .direction left
    .annotation-above meltwater`,
    css: `@node ocean {
  shape: pill;
  fill: #0369a1;
  color: #ffffff;
  outline: #075985;
  width: 135;
}

@node sky {
  shape: round;
  fill: #e0f2fe;
  color: #075985;
  outline: #38bdf8;
  outline-style: dotted;
  width: 115;
  height: 115;
}

@node cloud {
  shape: rounded;
  fill: #ffffff;
  color: #475569;
  outline: #94a3b8;
  width: 135;
  shadow-color: #64748b;
  shadow-offset-y: 4;
  shadow-blur: 12;
  shadow-opacity: 0.18;
}

@node rain {
  shape: hexagon;
  fill: #0ea5e9;
  color: #ffffff;
  outline: #0284c7;
  width: 140;
}

@node land {
  shape: rounded;
  fill: #bbf7d0;
  color: #166534;
  outline: #4ade80;
  width: 145;
}`
  },
  {
    name: "Quadratic formula",
    pug: `// Demo 8 — a visual math explainer with bundled TeX rendering
.background #fafafa
.defaults
  node
    .font-family Georgia, serif
  flow
    .color #4338ca
    .width 2
    .arrow-style forward

graph
  .id lesson
  .label Solving a quadratic equation
  .label-position inside
  .fill #ffffff
  .outline #c7d2fe
  .outline-width 2
  .padding 42
  .x-spacing 58
  node
    .equation
    .id standard
    .label $$ax^2 + bx + c = 0$$
  node
    .operation
    .id identify
    .label Identify $a$, $b$, and $c$
  node
    .formula
    .id solve
    .label $$x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}$$
  node
    .answer
    .id roots
    .label Two roots
  node
    .operation
    .id verify
    .label Substitute to verify
  flow
    .from standard
    .to identify
    .direction right
  flow
    .from identify
    .to solve
    .direction right
  flow
    .from solve
    .to roots
    .direction right
  flow
    .from roots
    .to verify
    .direction down`,
    css: `@node equation {
  shape: rounded;
  fill: #eef2ff;
  color: #312e81;
  outline: #818cf8;
  width: 175;
}

@node operation {
  shape: hexagon;
  fill: #ffffff;
  color: #3730a3;
  outline: #6366f1;
  width: 155;
}

@node formula {
  shape: rounded;
  fill: #312e81;
  color: #ffffff;
  outline: #1e1b4b;
  width: 230;
}

@node answer {
  shape: pill;
  fill: #4f46e5;
  color: #ffffff;
  outline: #3730a3;
  width: 120;
}`
  },
  {
    name: "Japan itinerary",
    pug: `// Demo 9 — a rail itinerary with two routes across Japan
.background #fff1f2
.defaults
  flow
    .color #e11d48
    .width 3
    .arrow-style forward

graph
  .id japan
  .label Seven days by rail
  .label-position inside
  .fill #ffffff
  .outline #fda4af
  .outline-width 2
  .padding 38
  .x-spacing 64
  .y-spacing 52
  node
    .city
    .id tokyo
    .label
      | Days 1–2
      | Tokyo
  node
    .nature
    .id hakone
    .label
      | Day 3
      | Hakone
  node
    .city
    .id kanazawa
    .label
      | Day 3
      | Kanazawa
  node
    .city
    .id kyoto
    .label
      | Days 4–5
      | Kyoto
  node
    .food
    .id osaka
    .label
      | Days 6–7
      | Osaka
  node
    .nature
    .id nikko
    .label Nikko
  node
    .city
    .id nagano
    .label Nagano
  node
    .nature
    .id shirakawa
    .label Shirakawa-go
  node
    .city
    .id takayama
    .label Takayama
  node
    .nature
    .id nara
    .label Nara
  node
    .food
    .id kobe
    .label Kobe
  node
    .city
    .id hiroshima
    .label Hiroshima
  flow
    .from tokyo
    .to hakone
    .direction left
    .annotation-above 35 min
  flow
    .from tokyo
    .to kanazawa
    .direction right
    .annotation-above 2.5 hr
  flow
    .from hakone
    .to kyoto
    .direction down
    .annotation-above via Mt. Fuji
  flow
    .from kanazawa
    .to kyoto
    .direction down
    .annotation-above via the Alps
  flow
    .from kyoto
    .to osaka
    .direction down
    .annotation-above 15 min
  flow
    .from tokyo
    .to nikko
    .direction up
    .annotation-above day trip
  flow
    .from nikko
    .to nagano
    .direction right
  flow
    .from nagano
    .to kanazawa
    .direction down
  flow
    .from kanazawa
    .to shirakawa
    .direction right
  flow
    .from shirakawa
    .to takayama
    .direction down
  flow
    .from takayama
    .to kyoto
    .direction left
  flow
    .from kyoto
    .to nara
    .direction right
  flow
    .from nara
    .to osaka
    .direction down
  flow
    .from osaka
    .to kobe
    .direction left
  flow
    .from osaka
    .to hiroshima
    .direction right
  flow
    .from kobe
    .to hiroshima
    .direction down`,
    css: `@node city {
  shape: rounded;
  fill: #ffe4e6;
  color: #9f1239;
  outline: #fb7185;
  width: 130;
}

@node nature {
  shape: hexagon;
  fill: #166534;
  color: #ffffff;
  outline: #14532d;
  width: 130;
}

@node food {
  shape: pill;
  fill: #e11d48;
  color: #ffffff;
  outline: #be123c;
  width: 130;
}`
  },
  {
    name: "Home network",
    pug: `// Demo 10 — a practical home network map
.background #f8fafc
.defaults
  flow
    .color #475569
    .width 2
    .arrow-style none

graph
  .id network
  .label Home network
  .label-position inside
  .fill #ffffff
  .outline #cbd5e1
  .outline-width 2
  .padding 40
  .x-spacing 70
  .y-spacing 52
  node
    .internet
    .id fiber
    .label Fiber internet
  node
    .router
    .id router
    .label Wi-Fi router
    .annotation
      .above
        | 192.168.1.1
  node
    .wired
    .id nas
    .label Photo backup NAS
  node
    .wireless
    .id laptop
    .label Work laptop
  node
    .wireless
    .id phone
    .label Phone
  node
    .iot
    .id thermostat
    .label Thermostat
  node
    .wired
    .id switch
    .label Managed switch
  node
    .wired
    .id desktop
    .label Gaming desktop
  node
    .wired
    .id media
    .label Media server
  node
    .wired
    .id printer
    .label Office printer
  node
    .wireless
    .id tablet
    .label Family tablet
  node
    .wireless
    .id television
    .label Living room TV
  node
    .wireless
    .id speaker
    .label Kitchen speaker
  node
    .iot
    .id doorbell
    .label Video doorbell
  node
    .iot
    .id camera-garage
    .label Garage camera
  node
    .iot
    .id camera-yard
    .label Yard camera
  node
    .router
    .id access-point
    .label Upstairs access point
  node
    .wireless
    .id guest-phone
    .label Guest phone
  node
    .iot
    .id lights
    .label Smart lights
  node
    .wired
    .id bridge
    .label Home automation bridge
  flow
    .from fiber
    .to router
    .direction down
    .color #2563eb
    .width 3
  flow
    .from router
    .to nas
    .direction down
    .annotation-above Ethernet
  flow
    .from router
    .to laptop
    .direction down
    .stroke-style dashed
    .annotation-above Wi-Fi 6
  flow
    .from router
    .to phone
    .direction down
    .stroke-style dashed
  flow
    .from router
    .to thermostat
    .direction down
    .stroke-style dotted
    .color #a855f7
  flow
    .from router
    .to switch
    .direction left
    .annotation-above 2.5 GbE
  flow
    .from switch
    .to nas
    .direction down
  flow
    .from switch
    .to desktop
    .direction left
  flow
    .from switch
    .to media
    .direction right
  flow
    .from switch
    .to printer
    .direction down
  flow
    .from router
    .to access-point
    .direction right
    .stroke-style dashed
    .annotation-above mesh backhaul
  flow
    .from router
    .to tablet
    .direction down
    .stroke-style dashed
  flow
    .from router
    .to television
    .direction down
    .stroke-style dashed
  flow
    .from router
    .to speaker
    .direction down
    .stroke-style dashed
  flow
    .from access-point
    .to guest-phone
    .direction down
    .stroke-style dashed
  flow
    .from access-point
    .to lights
    .direction right
    .stroke-style dotted
    .color #a855f7
  flow
    .from access-point
    .to doorbell
    .direction left
    .stroke-style dotted
    .color #a855f7
  flow
    .from access-point
    .to camera-garage
    .direction down
    .stroke-style dotted
    .color #a855f7
  flow
    .from access-point
    .to camera-yard
    .direction right
    .stroke-style dotted
    .color #a855f7
  flow
    .from switch
    .to bridge
    .direction down
  flow
    .from bridge
    .to thermostat
    .direction left
    .stroke-style dotted
    .color #a855f7
  flow
    .from bridge
    .to lights
    .direction right
    .stroke-style dotted
    .color #a855f7
  flow
    .from media
    .to television
    .direction right
    .arrow-style forward
    .annotation-above stream`,
    css: `@node internet {
  shape: pill;
  fill: #2563eb;
  color: #ffffff;
  outline: #1d4ed8;
  width: 135;
}

@node router {
  shape: hexagon;
  fill: #0f172a;
  color: #ffffff;
  outline: #38bdf8;
  outline-width: 2;
  width: 140;
}

@node wired {
  shape: rounded;
  fill: #e2e8f0;
  color: #0f172a;
  outline: #64748b;
  width: 140;
}

@node wireless {
  shape: rounded;
  fill: #ecfeff;
  color: #155e75;
  outline: #22d3ee;
  outline-style: dashed;
  width: 125;
}

@node iot {
  shape: round;
  fill: #f3e8ff;
  color: #6b21a8;
  outline: #c084fc;
  width: 105;
  height: 105;
}`
  }
];
