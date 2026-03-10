export const INITIAL_WAVE = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q9",
  "q10",
  "q11",
  "q12",
  "q13",
  "q19",
  "q22",
  "q30"
];

export const QUESTIONS: Record<string, any> = {

  q1: { question: "Company Name", type: "text" },

  q2: { question: "Upload Logo", type: "file" },

  q3: {
    question: "Company type",
    type: "select",
    options: ["B2B","B2C","DTC"]
  },

  q4: {
    question: "Years in business",
    type: "number"
  },

  q5: {
    question: "Industry",
    type: "select",
    options: ["SaaS","Apparel","Footwear","Beverage","Automotive"]
  },

  q6: {
    question: "Need Morpheus UI in multiple languages?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q7"],
      No: ["q8"]
    }
  },

  q7: {
    question: "Enter languages needed",
    type: "text"
  },

  q8: {
    question: "How many Morpheus users?",
    type: "number"
  },

  q9: {
    question: "Teams using UI",
    type: "multiselect",
    options: [
        "Marketing",
        "Product",
        "Finance",
        "Product Marketing",
        "Sales"
    ]
  },

  q10: {
    question: "Countries sold in",
    type: "text"
  },

  q11: {
    question: "Upload product categories",
    type: "file"
  },

  q12: {
    question: "Upload products",
    type: "file"
  },

  q13: {
    question: "Multiple currencies?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q14","q15"],
      No: ["q16"]
    }
  },

  q14: {
    question: "Marketing currency",
    type: "text"
  },

  q15: {
    question: "Financial reporting currency",
    type: "text"
  },

  q16: {
    question: "Retail presence?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q17"],
      No: ["q18"]
    }
  },

  q17: {
    question: "POS reporting system",
    type: "text"
  },

  q18: {
    question: "Marketing channels",
    type: "multiselect",
    options: ["Television", "Radio", "Print", "Meta - Facebook", "Meta - Instagram", "Google Ads", "Bing", "Yahoo", "Affiliate Networks", "SMS", "Google Display Network", "Display (another company", "LinkedIn", "Influencers", "TikTok", "Youtube", "Forums (quora, reddit"]
  },

  q19: {
    question: "Marketing email campaigns?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q20"],
      No: ["q21"]
    }
  },

  q20: {
    question: "Email provider",
    type: "select",
    options: ["Klaviyo","Responsys","Sendgrid","Mailchimp", "Eloqua"]
  },

  q21: {
    question: "Organic channels",
    type: "multiselect",
    options: ["SEO","Organic Social","YouTube","Quora", "Reddit"]
  },

  q22: {
    question: "Use attribution?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q23"]
    }
  },

  q23: {
    question: "Attribution type",
    type: "select",
    options: ["Last Touch","First Touch","Multi-touch"],

    next: {
      "Last Touch": ["q24"],
      "First Touch": ["q24"],
      "Multi-touch": ["q26"]
    }
  },

  q24: {
    question: "Built in house?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q28"],
      No: ["q25"]
    }
  },

  q25: {
    question: "Attribution provider",
    type: "text"
  },

  q26: {
    question: "Multi-touch built in house?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q29"],
      No: ["q28"]
    }
  },
  q27: {
    question: "What central reporting system do you use?",
    type: "text"
  },
  q28: {
    question: "Where is performance reported?",
    type: "select",
    options: ["Third Party Company Dashboard", "Internal Google Analytics", "Internal Dashboard"]
  },

  q29: {
    question: "3 competitors",
    type: "text"
  },

  q30: {
    question: "What percentage of your marketing spend drives to what goal? Enter percentage for Awareness, Product Revenue through sale or subscription, Trials, Leads",
    type: "text"
  }

};