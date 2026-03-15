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

  q1: { question: "What is the Company Name?", type: "text" },

  q2: { question: "Upload Logo", type: "file" },

  q3: {
    question: "What is the Company type?",
    type: "select",
    options: ["B2B","B2C","DTC"]
  },

  q4: {
    question: "How many years in business?",
    type: "number"
  },

  q5: {
    question: "Select the Industry",
    type: "select",
    options: ["SaaS","Apparel","Footwear","Beverage","Automotive"]
  },

  q6: {
    question: "Does it need Morpheus UI in multiple languages?",
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
    question: "How many potential Morpheus users will there be?",
    type: "number"
  },

  q9: {
    question: "How many different teams will be accessing the UI?",
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
    question: "Upload or select all the countries the company sells the product in",
    type: "text"
  },

  q11: {
    question: "Upload a list of company product categories",
    type: "file"
  },

  q12: {
    question: "Upload a list of products for the company",
    type: "file"
  },

  q13: {
    question: "Does the company sell in multiple currencies?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q14","q15"],
      No: ["q16"]
    }
  },

  q14: {
    question: "What currency are represented in the digital platforms they spend marketing budget on?",
    type: "text"
  },

  q15: {
    question: "What currency is the financial reporting in?",
    type: "text"
  },

  q16: {
    question: "Does the company have a retail presence (brick and mortar)?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q17"],
      No: ["q18"]
    }
  },

  q17: {
    question: "What reporting systems does the client use for point of sale (POS) data?  ",
    type: "text"
  },

  q18: {
    question: "Which platforms does the company spend marketing budget on?",
    type: "multiselect",
    options: ["Television", "Radio", "Print", "Meta - Facebook", "Meta - Instagram", "Google Ads", "Bing", "Yahoo", "Affiliate Networks", "SMS", "Google Display Network", "Display (another company", "LinkedIn", "Influencers", "TikTok", "Youtube", "Forums (quora, reddit"],
    next: ["q31"]
  },

  q19: {
    question: "Does the company have email campaigns that are marketing (not transactional) based? (nurture campaigns, etc) ",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q20"],
      No: ["q21"]
    }
  },

  q20: {
    question: "What email provider does the company use?",
    type: "select",
    options: ["Klaviyo","Responsys","Sendgrid","Mailchimp", "Eloqua"]
  },

  q21: {
    question: "What are the list of organic channels that the client uses for marketing? ",
    type: "multiselect",
    options: ["SEO","Organic Social","YouTube","Quora", "Reddit"]
  },

  q22: {
    question: "Does the client leverage anyattribution?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q23"]
    }
  },

  q23: {
    question: "What attribution type does the company use?",
    type: "select",
    options: ["Last Touch","First Touch","Multi-touch"],

    next: {
      "Last Touch": ["q24"],
      "First Touch": ["q24"],
      "Multi-touch": ["q26"]
    }
  },

  q24: {
    question: "Is this Last/First touch system built in house or done by a system?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q28"],
      No: ["q25"]
    }
  },

  q25: {
    question: "For your attribution system, do you use Google Analytics or another provider for this?",
    type: "text"
  },

  q26: {
    question: "For your multi-touch attribution system is it built inhouse or do you use a third party company?",
    type: "select",
    options: ["Yes","No"],

    next: {
      Yes: ["q29"],
      No: ["q28"]
    }
  },
  q27: {
    question: "If you use multi-touch attribution system that is built in-house, what central reporting system do you use to display / report out on performance?",
    type: "text"
  },
  q28: {
    question: "If you use a third-party company or built your attribution in-house, what program is the performance reported out through?",
    type: "select",
    options: ["Third Party Company Dashboard", "Internal Google Analytics", "Internal Dashboard"]
  },

  q29: {
    question: "Who are your 3 direct competitors?",
    type: "text"
  },

  q30: {
    question: "What percentage of your marketing spend drives to what goal? Enter percentage for Awareness, Product Revenue through sale or subscription, Trials, Leads",
    type: "text"
  },
    q31: {
    question: "Upload campaign tracking samples for each engine",
    type: "channel_examples"
    }
};