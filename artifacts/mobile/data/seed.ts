export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  duration: string;
  hasQuiz: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  lessonId: string;
  questions: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  iconName: string;
  color: string;
  isPremium: boolean;
  lessons: Lesson[];
  quizzes: Quiz[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  duration: string;
  iconName: string;
  color: string;
  category: string;
  isPremium: boolean;
  steps: string[];
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  options: { label: string; score: number }[];
  category: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  iconName: string;
  color: string;
  condition: string;
}

export interface WeeklyTip {
  id: string;
  title: string;
  content: string;
  category: string;
  iconName: string;
}

export const COURSES: Course[] = [
  {
    id: "c1",
    title: "Cyberbullying Prevention",
    category: "Safety",
    description: "Help your child recognize, respond to, and recover from cyberbullying. Learn practical strategies for building digital resilience.",
    duration: "25 min",
    level: "beginner",
    iconName: "shield",
    color: "#4A90A4",
    isPremium: false,
    lessons: [
      {
        id: "c1l1",
        courseId: "c1",
        title: "What is Cyberbullying?",
        content: "Cyberbullying is bullying that happens over digital devices like phones, computers, and tablets. It includes sending, posting, or sharing negative, harmful, false, or mean content about someone else.\n\nCommon forms include:\n• Sending hurtful messages or threats\n• Spreading false rumors online\n• Posting embarrassing photos or videos\n• Excluding someone from online groups\n• Creating fake profiles to harm someone\n\nUnlike traditional bullying, cyberbullying can happen 24/7 and reach a wide audience very quickly. The permanence of digital content makes it especially difficult for victims.",
        duration: "8 min",
        hasQuiz: true,
      },
      {
        id: "c1l2",
        courseId: "c1",
        title: "Recognizing Warning Signs",
        content: "Children experiencing cyberbullying may show these warning signs:\n\n• Emotional distress during or after using devices\n• Being secretive about online activities\n• Unexpectedly avoiding devices they usually love\n• Appearing upset, depressed, or angry after being online\n• Withdrawing from friends and family\n• Unexplained decline in grades\n\nWhat to do if you notice warning signs:\n1. Create a safe, non-judgmental space for conversation\n2. Listen without minimizing their experience\n3. Document the bullying (screenshots, dates)\n4. Contact their school if school-related\n5. Seek professional help if needed",
        duration: "9 min",
        hasQuiz: true,
      },
      {
        id: "c1l3",
        courseId: "c1",
        title: "Building Digital Resilience",
        content: "Digital resilience is the ability to manage and recover from negative online experiences. Help your child develop these skills:\n\n• Healthy skepticism: Not everything online is true\n• Emotional regulation: Learning to pause before reacting online\n• Seeking help: Knowing when and how to ask for adult support\n• Positive relationships: Cultivating supportive online friendships\n\nFamily strategies:\n1. Keep devices in common areas\n2. Follow platform age requirements\n3. Maintain open conversations about online experiences\n4. Model healthy digital behavior yourself\n5. Create a family technology agreement",
        duration: "8 min",
        hasQuiz: false,
      },
    ],
    quizzes: [
      {
        lessonId: "c1l1",
        questions: [
          {
            id: "c1l1q1",
            question: "Which of these is an example of cyberbullying?",
            options: ["Playing an online game with friends", "Spreading false rumors about a classmate online", "Sharing your favorite meme", "Posting a photo of your pet"],
            correctIndex: 1,
            explanation: "Spreading false rumors online is cyberbullying because it is intended to harm someone's reputation.",
          },
          {
            id: "c1l1q2",
            question: "How is cyberbullying different from traditional bullying?",
            options: ["It only happens at school", "It can happen 24/7 and reach a wide audience", "It is always less serious", "It can only happen between strangers"],
            correctIndex: 1,
            explanation: "Cyberbullying can happen at any time and spread rapidly to a large audience.",
          },
        ],
      },
      {
        lessonId: "c1l2",
        questions: [
          {
            id: "c1l2q1",
            question: "What should you do first if you suspect your child is being cyberbullied?",
            options: ["Immediately take away their devices", "Create a safe, non-judgmental space for conversation", "Contact the bully's parents directly", "Post about it on social media"],
            correctIndex: 1,
            explanation: "Opening a safe conversation lets your child feel supported and gives you information to help them appropriately.",
          },
        ],
      },
    ],
  },
  {
    id: "c2",
    title: "Online Scam Awareness",
    category: "Safety",
    description: "Teach your family to spot phishing, fraud, and digital scams before they cause harm. Real examples and practical defense strategies.",
    duration: "20 min",
    level: "beginner",
    iconName: "alert-triangle",
    color: "#E07B39",
    isPremium: false,
    lessons: [
      {
        id: "c2l1",
        courseId: "c2",
        title: "Common Online Scams",
        content: "Online scams targeting children and teens are increasingly sophisticated:\n\n• Gaming Scams: Fake free V-bucks, skins, or in-game currency\n• Social Media Scams: 'You've been selected!' or 'Win a free iPhone'\n• Phishing: Fake login pages that steal passwords\n• Romance/Friendship Scams: Building trust to request money or photos\n• 'Get Rich Quick': Investment schemes and crypto scams\n\nScammers use urgency, excitement, and fear to bypass critical thinking. Teaching your child to pause and verify is the most effective defense.",
        duration: "7 min",
        hasQuiz: true,
      },
      {
        id: "c2l2",
        courseId: "c2",
        title: "How to Spot a Scam",
        content: "Teach your family these red flags:\n\n• Too good to be true offers (free money, prizes, items)\n• Urgent messages demanding immediate action\n• Requests for personal information (passwords, addresses)\n• Suspicious links or email addresses\n• Poor grammar and spelling in official-looking messages\n• Requests for gift card payments\n• Pressure to keep communication secret\n\nThe STOP-THINK-VERIFY method:\n1. STOP - Don't click or respond immediately\n2. THINK - Does this make sense? Who benefits?\n3. VERIFY - Check with a trusted adult or official source",
        duration: "8 min",
        hasQuiz: false,
      },
      {
        id: "c2l3",
        courseId: "c2",
        title: "What to Do If Scammed",
        content: "If your child encounters or falls for a scam:\n\n1. Stay calm - Avoid shaming or punishment, which discourages future reporting\n2. Stop contact - Block and report the scammer immediately\n3. Change passwords - For any accounts that may be compromised\n4. Document everything - Save screenshots of communications\n5. Report it - To the platform, FTC (reportfraud.ftc.gov), or local authorities\n6. Monitor accounts - Check for unauthorized activity\n\nRemember: Scammers are professionals. Anyone can be targeted. What matters is how quickly you respond.",
        duration: "5 min",
        hasQuiz: false,
      },
    ],
    quizzes: [
      {
        lessonId: "c2l1",
        questions: [
          {
            id: "c2l1q1",
            question: "A friend sends you a link saying 'Get free Robux! Click here!' What should you do?",
            options: ["Click the link right away", "Share it with all your friends", "Tell a trusted adult and don't click", "Enter your username to claim the reward"],
            correctIndex: 2,
            explanation: "Free in-game currency offers are almost always scams. Always tell a trusted adult before clicking unknown links.",
          },
        ],
      },
    ],
  },
  {
    id: "c3",
    title: "Social Media Readiness",
    category: "Social",
    description: "Is your child ready for social media? Navigate platform age limits, privacy settings, and healthy usage patterns together.",
    duration: "30 min",
    level: "intermediate",
    iconName: "share-2",
    color: "#7B5EA7",
    isPremium: false,
    lessons: [
      {
        id: "c3l1",
        courseId: "c3",
        title: "Age Requirements & Why They Matter",
        content: "Most major social media platforms require users to be at least 13 years old, per COPPA. But age limits exist for more than legal reasons:\n\n• Developing brains are more susceptible to social comparison\n• Younger children struggle to differentiate between online personas and reality\n• Emotional regulation skills needed for social media develop through adolescence\n\nPlatform minimums:\n• Instagram, TikTok, Snapchat: 13+\n• YouTube: 13+ for accounts\n• Discord: 13+\n• Facebook: 13+\n\nAge requirements are minimum guidelines, not recommendations. Consider your child's maturity, not just their age.",
        duration: "10 min",
        hasQuiz: true,
      },
      {
        id: "c3l2",
        courseId: "c3",
        title: "Privacy Settings Walkthrough",
        content: "Privacy settings are your first line of defense. Walk through these with your child:\n\nKey settings on every platform:\n• Account visibility: Set to private\n• Who can send messages: Friends only\n• Location sharing: Always off\n• Who can see posts: Friends only\n• Two-factor authentication: Always on\n\nAlso discuss what should NEVER be shared online:\n• Home address\n• School name\n• Phone number\n• Daily schedule/routine\n• Photos showing your location",
        duration: "12 min",
        hasQuiz: false,
      },
      {
        id: "c3l3",
        courseId: "c3",
        title: "Healthy Social Media Habits",
        content: "Research shows social media affects wellbeing. Help your child develop these habits:\n\n• Set time limits using built-in tools\n• Take device-free breaks during meals and before bed\n• Follow accounts that inspire rather than drain\n• Practice the 'post pause': wait 24 hours before posting something emotional\n• Unfollow accounts that make you feel bad about yourself\n• Remember: most profiles show highlight reels, not real life\n\nConversation starters:\n• 'How do you feel after spending time on [platform]?'\n• 'Who do you follow that makes you feel good?'",
        duration: "8 min",
        hasQuiz: false,
      },
    ],
    quizzes: [
      {
        lessonId: "c3l1",
        questions: [
          {
            id: "c3l1q1",
            question: "What is the minimum age for most major social media platforms?",
            options: ["10 years old", "13 years old", "16 years old", "18 years old"],
            correctIndex: 1,
            explanation: "Most platforms require 13+ as required by COPPA (Children's Online Privacy Protection Act).",
          },
          {
            id: "c3l1q2",
            question: "Which of these should NEVER be shared on social media?",
            options: ["Your favorite movie", "A photo of your pet", "Your home address", "A book recommendation"],
            correctIndex: 2,
            explanation: "Home addresses reveal your physical location and should never be shared publicly online.",
          },
        ],
      },
    ],
  },
  {
    id: "c4",
    title: "Online Predator Awareness",
    category: "Safety",
    description: "Equip your family with knowledge to recognize manipulation tactics and create safe communication practices.",
    duration: "35 min",
    level: "intermediate",
    iconName: "eye-off",
    color: "#C0392B",
    isPremium: true,
    lessons: [
      {
        id: "c4l1",
        courseId: "c4",
        title: "Understanding Grooming",
        content: "Online grooming is when someone builds a relationship with a child to exploit them. Understanding these tactics helps families protect themselves:\n\n• Building trust gradually over time\n• Offering compliments, gifts, or special attention\n• Isolating the child from family and friends\n• Introducing inappropriate topics slowly\n• Requesting secrecy\n• Using flattery and emotional manipulation\n\nGrooming can happen on any platform: social media, gaming, messaging apps, and school tools.\n\nImportant: Groomers often present as peers or authority figures. The 'stranger danger' concept is outdated — most exploitation involves someone the child feels they know.",
        duration: "12 min",
        hasQuiz: true,
      },
      {
        id: "c4l2",
        courseId: "c4",
        title: "Safe Communication Rules",
        content: "Establish these family rules for online communication:\n\n1. Never share personal information with online-only contacts\n2. Never meet an online contact in person without parent knowledge\n3. Tell a parent immediately if someone online makes you uncomfortable\n4. No secret conversations\n5. Trust your instincts — if something feels wrong, it probably is\n\nCreate a 'code word' your child can use when they need help without explaining why.\n\nRemind your child:\n• They will NEVER get in trouble for reporting\n• Grooming is NEVER the child's fault\n• They can always come to you, no matter what happened",
        duration: "10 min",
        hasQuiz: false,
      },
      {
        id: "c4l3",
        courseId: "c4",
        title: "Reporting & Getting Help",
        content: "If your child is being targeted:\n\n1. Don't delete evidence - Save all communications\n2. Block and report the person on the platform\n3. Contact law enforcement or NCMEC (CyberTipline.org)\n4. Seek professional support for your child\n\nResources:\n• National Center for Missing & Exploited Children: 1-800-THE-LOST\n• Internet Crimes Against Children Task Force: icactaskforce.org\n• Crisis Text Line: Text HOME to 741741\n\nRemember: You are not alone. Early reporting saves lives.",
        duration: "13 min",
        hasQuiz: false,
      },
    ],
    quizzes: [
      {
        lessonId: "c4l1",
        questions: [
          {
            id: "c4l1q1",
            question: "Which is a common tactic used in online grooming?",
            options: ["Immediately asking for personal details", "Building trust gradually over time and requesting secrecy", "Only communicating in public forums", "Introducing themselves as a professional"],
            correctIndex: 1,
            explanation: "Groomers typically build trust slowly over time and often request that the relationship be kept secret from parents.",
          },
        ],
      },
    ],
  },
  {
    id: "c5",
    title: "AI Safety & Literacy",
    category: "Technology",
    description: "Navigate AI tools together: chatbots, deepfakes, AI-generated content, and responsible use for school and creative work.",
    duration: "28 min",
    level: "intermediate",
    iconName: "cpu",
    color: "#2D7DD2",
    isPremium: true,
    lessons: [
      {
        id: "c5l1",
        courseId: "c5",
        title: "Understanding AI Tools",
        content: "Artificial Intelligence is increasingly part of daily life. Help your family understand what AI can and can't do:\n\nCommon AI tools kids encounter:\n• Chatbots (ChatGPT, Gemini, Claude)\n• AI image generators\n• AI writing assistants\n• Social media recommendation algorithms\n• Deepfake technology\n\nKey concepts to discuss:\n• AI can generate false information confidently ('hallucination')\n• AI-generated content can be very realistic but not real\n• AI learns from patterns in data, which can include biases\n• Using AI for school work without disclosure may be considered cheating\n\nAI literacy is a critical skill for the 21st century.",
        duration: "10 min",
        hasQuiz: true,
      },
      {
        id: "c5l2",
        courseId: "c5",
        title: "Deepfakes & Misinformation",
        content: "Deepfakes are AI-generated videos, images, or audio that appear real but are fabricated. This technology poses real risks:\n\nHow to spot deepfakes:\n• Unnatural blinking or facial movement\n• Inconsistent lighting or shadows\n• Blurry edges around faces or hair\n• Audio that doesn't match lip movement\n\nFor information verification:\n1. Check multiple reputable sources\n2. Use reverse image search\n3. Look for original source and publication date\n4. Check fact-checking sites (Snopes, PolitiFact)\n5. Be especially skeptical of emotionally charged content",
        duration: "9 min",
        hasQuiz: false,
      },
      {
        id: "c5l3",
        courseId: "c5",
        title: "Responsible AI Use",
        content: "Guidelines for responsible AI use:\n\nFor school/learning:\n• AI can help brainstorm and understand concepts\n• Always verify AI output with trusted sources\n• Cite AI assistance when required by school\n• Don't submit AI-generated work as your own\n\nFor personal use:\n• Don't share personal information with AI chatbots\n• Maintain critical thinking even when AI seems confident\n• Take AI health/safety advice as a starting point, not final guidance\n\nFamily discussion: How can we use AI as a helpful tool while staying in charge of our own thinking?",
        duration: "9 min",
        hasQuiz: false,
      },
    ],
    quizzes: [
      {
        lessonId: "c5l1",
        questions: [
          {
            id: "c5l1q1",
            question: "What is 'hallucination' in the context of AI chatbots?",
            options: ["When AI generates creative stories", "When AI confidently states false information as fact", "When AI refuses to answer a question", "When AI detects inappropriate content"],
            correctIndex: 1,
            explanation: "AI 'hallucination' refers to when an AI generates plausible-sounding but false information with apparent confidence.",
          },
        ],
      },
    ],
  },
  {
    id: "c6",
    title: "Digital Footprints",
    category: "Privacy",
    description: "Everything online leaves a trace. Help your family understand their digital footprint and manage their online reputation.",
    duration: "22 min",
    level: "beginner",
    iconName: "activity",
    color: "#27AE60",
    isPremium: false,
    lessons: [
      {
        id: "c6l1",
        courseId: "c6",
        title: "What Is a Digital Footprint?",
        content: "A digital footprint is the trail of data you leave online. There are two types:\n\nActive footprint: Information you deliberately share\n• Social media posts and comments\n• Photos and videos you upload\n• Forms you fill out\n\nPassive footprint: Information collected without you realizing\n• Websites you visit (tracked via cookies)\n• Your location (via apps)\n• Search history\n\nYour digital footprint can affect:\n• College admissions\n• Job opportunities\n• Personal safety\n\nEven 'deleted' content may exist in screenshots or archives.",
        duration: "8 min",
        hasQuiz: true,
      },
      {
        id: "c6l2",
        courseId: "c6",
        title: "Managing Your Online Reputation",
        content: "Help your child think before they post:\n\n• Would I be comfortable if my parents/teacher/future employer saw this?\n• Could this be misunderstood out of context?\n• Could this hurt me or someone else in the future?\n\nThe 24-hour rule: Wait 24 hours before posting anything emotional.\n\nPositive digital footprint building:\n• Share interests, achievements, and creative work\n• Engage positively in communities\n• Build a portfolio of positive content\n\nGoogle yourself: Regularly search your child's name to see what's publicly visible.",
        duration: "8 min",
        hasQuiz: false,
      },
      {
        id: "c6l3",
        courseId: "c6",
        title: "Privacy Controls & Data Management",
        content: "Practical steps to manage your digital footprint:\n\n1. Audit privacy settings quarterly on all platforms\n2. Review and delete old posts that no longer represent you\n3. Use privacy-focused search engines (DuckDuckGo)\n4. Clear browser cookies regularly\n5. Review app permissions — location, camera, microphone\n6. Use strong, unique passwords and a password manager\n7. Enable two-factor authentication everywhere\n8. Think before downloading: does this app need my data?",
        duration: "6 min",
        hasQuiz: false,
      },
    ],
    quizzes: [
      {
        lessonId: "c6l1",
        questions: [
          {
            id: "c6l1q1",
            question: "Which of these is an example of a passive digital footprint?",
            options: ["Posting a photo on Instagram", "Sending an email", "Websites tracking your browsing history via cookies", "Signing up for a newsletter"],
            correctIndex: 2,
            explanation: "Passive footprints are created without deliberate action — like websites tracking your visits through cookies.",
          },
        ],
      },
    ],
  },
  {
    id: "c7",
    title: "Gaming Safety",
    category: "Gaming",
    description: "Online gaming has unique risks. Learn about in-game purchases, stranger interactions, and healthy gaming boundaries.",
    duration: "25 min",
    level: "beginner",
    iconName: "play-circle",
    color: "#8E44AD",
    isPremium: false,
    lessons: [
      {
        id: "c7l1",
        courseId: "c7",
        title: "Risks in Online Gaming",
        content: "Online gaming connects players worldwide — mostly positively, but with real risks:\n\nCommunication risks:\n• Strangers in voice and text chat may not be who they seem\n• Personal information shared in gaming can be used harmfully\n• Toxic behavior and harassment in competitive games\n\nFinancial risks:\n• Loot boxes and microtransactions designed to encourage spending\n• Scams offering free in-game items\n• Unauthorized purchases on family payment methods\n\nBehavioral risks:\n• Gaming addiction and impact on sleep, school, and relationships\n• Exposure to age-inappropriate content\n\nMost gaming platforms have built-in parental controls — use them!",
        duration: "9 min",
        hasQuiz: true,
      },
      {
        id: "c7l2",
        courseId: "c7",
        title: "Setting Healthy Gaming Limits",
        content: "Gaming can be a positive hobby when balanced. Work with your child to set limits:\n\nTime boundaries:\n• Agree on daily/weekly time limits\n• No gaming within 1 hour of bedtime\n• Homework and chores before gaming\n• Use platform time limits (PS5, Xbox, Nintendo all have them)\n\nContent boundaries:\n• Review game ratings (ESRB): E, E10+, T, M\n• Check online play and chat features before allowing\n\nFinancial safety:\n• Remove saved payment methods from gaming accounts\n• Require approval for all purchases\n• Discuss loot box mechanics honestly",
        duration: "9 min",
        hasQuiz: false,
      },
      {
        id: "c7l3",
        courseId: "c7",
        title: "Gaming as a Positive Activity",
        content: "Gaming has real benefits when done in balance:\n\n• Develops problem-solving and strategic thinking\n• Builds teamwork and communication skills\n• Can be a social outlet, especially for introverted kids\n• Creative games build design and storytelling skills\n• Some games teach history, science, and other subjects\n\nHow to make gaming positive:\n1. Play together — co-op games are great for bonding\n2. Talk about games they're playing\n3. Connect gaming interests to real-world activities\n4. Celebrate achievements without excessive screen time\n5. Balance with outdoor, physical, and creative activities",
        duration: "7 min",
        hasQuiz: false,
      },
    ],
    quizzes: [
      {
        lessonId: "c7l1",
        questions: [
          {
            id: "c7l1q1",
            question: "What should you do if someone in a game asks for your home address?",
            options: ["Share it if they seem nice", "Tell a trusted adult immediately", "Only share your city, not full address", "Ignore them and keep playing"],
            correctIndex: 1,
            explanation: "You should never share personal information with online strangers. Tell a trusted adult immediately if someone asks for your personal information.",
          },
        ],
      },
    ],
  },
  {
    id: "c8",
    title: "Healthy Screen Habits",
    category: "Wellness",
    description: "Balance digital and offline life. Science-backed strategies for healthy tech use across all age groups.",
    duration: "20 min",
    level: "beginner",
    iconName: "sun",
    color: "#F39C12",
    isPremium: false,
    lessons: [
      {
        id: "c8l1",
        courseId: "c8",
        title: "The Science of Screen Time",
        content: "Research on screen time reveals important insights:\n\nFor children 2-5: Limited screen time (1 hour/day) of high-quality content with parent co-viewing\nFor children 6+: Consistent limits on time spent, prioritizing quality of content\nFor teens: Research shows social media impact on wellbeing, particularly for girls\n\nPhysical effects of excessive screen time:\n• Eye strain and headaches\n• Disrupted sleep (blue light affects melatonin)\n• Reduced physical activity\n• Poor posture\n\nMental health effects:\n• Increased anxiety and depression in heavy social media users\n• Reduced attention span\n• Disrupted social skill development",
        duration: "8 min",
        hasQuiz: true,
      },
      {
        id: "c8l2",
        courseId: "c8",
        title: "Creating a Family Media Plan",
        content: "The American Academy of Pediatrics recommends creating a personalized family media plan. Key elements:\n\nTech-free zones:\n• Bedrooms during sleep\n• Dinner table\n• First hour after school\n\nTech-free times:\n• During family conversations\n• One hour before bedtime\n• During outdoor play\n\nBuilding in balance:\n• Physical activity daily\n• Reading (non-screen) for 20+ minutes daily\n• Creative play and hobbies\n• In-person social time\n\nMake the plan together with your children — they're more likely to follow rules they helped create.",
        duration: "7 min",
        hasQuiz: false,
      },
      {
        id: "c8l3",
        courseId: "c8",
        title: "Digital Detox Strategies",
        content: "A digital detox doesn't have to be extreme. Small changes make big differences:\n\nMini-detoxes:\n• Phone-free meals\n• 30-minute outdoor walks without devices\n• Reading before bed instead of scrolling\n• Screen-free Sunday mornings\n\nReplacement activities:\n• Board games and puzzles\n• Cooking together\n• Art, music, or crafts\n• Sports or outdoor adventures\n• Community volunteering\n\nFor teens especially, help them find offline identities and hobbies — the goal isn't less screen time, it's more of everything else.",
        duration: "5 min",
        hasQuiz: false,
      },
    ],
    quizzes: [
      {
        lessonId: "c8l1",
        questions: [
          {
            id: "c8l1q1",
            question: "Why does blue light from screens affect sleep?",
            options: ["It makes eyes tired faster", "It signals daytime to the brain and reduces melatonin production", "It increases heart rate", "It causes headaches that prevent sleep"],
            correctIndex: 1,
            explanation: "Blue light mimics daylight and tells the brain to stay alert, reducing melatonin (the sleep hormone) and making it harder to fall asleep.",
          },
        ],
      },
    ],
  },
];

export const CHALLENGES: Challenge[] = [
  {
    id: "ch1",
    title: "Screen-Free Saturday",
    description: "Spend an entire Saturday enjoying offline activities as a family. Cook a meal together, play outside, or tackle a creative project.",
    duration: "1 day",
    iconName: "sun",
    color: "#F39C12",
    category: "Wellness",
    isPremium: false,
    steps: [
      "Plan your Screen-Free Saturday activities together as a family",
      "Put all devices in a designated charging station by 8am",
      "Cook breakfast together without looking anything up",
      "Spend at least 2 hours outdoors",
      "Try a board game, puzzle, or craft project",
      "Share one thing you enjoyed about the day at dinner",
    ],
  },
  {
    id: "ch2",
    title: "Dinner Without Devices",
    description: "For 7 consecutive dinners, no phones or screens at the table. Use conversation starters to reconnect as a family.",
    duration: "7 days",
    iconName: "coffee",
    color: "#27AE60",
    category: "Connection",
    isPremium: false,
    steps: [
      "Create a phone-free zone at your dinner table",
      "Use the conversation starter cards to spark discussion",
      "Share highlights and challenges from your day",
      "Take turns sharing one thing you're grateful for",
      "Listen actively — no interrupting!",
      "End dinner with a shared laugh or story",
      "Celebrate completing 7 dinners!",
    ],
  },
  {
    id: "ch3",
    title: "Digital Kindness Week",
    description: "Challenge your family to spread positivity online every day for a week. Leave kind comments, send encouraging messages, share helpful content.",
    duration: "7 days",
    iconName: "heart",
    color: "#E91E8C",
    category: "Social",
    isPremium: false,
    steps: [
      "Day 1: Leave a genuine compliment on a friend's post",
      "Day 2: Share something informative or helpful",
      "Day 3: Send an encouraging message to someone who might need it",
      "Day 4: Report something unkind you see online",
      "Day 5: Thank someone online who has helped you",
      "Day 6: Share a positive story or achievement",
      "Day 7: Reflect on how online kindness made you feel",
    ],
  },
  {
    id: "ch4",
    title: "Outdoor Adventure Challenge",
    description: "Replace screen time with outdoor exploration. Complete 5 outdoor activities in 2 weeks and earn the Explorer badge.",
    duration: "14 days",
    iconName: "map-pin",
    color: "#3A7D6B",
    category: "Wellness",
    isPremium: true,
    steps: [
      "Take a nature walk or hike as a family",
      "Visit a local park you've never been to",
      "Try a new outdoor sport or activity",
      "Star-gaze for at least 30 minutes",
      "Complete a community clean-up or outdoor volunteer activity",
    ],
  },
  {
    id: "ch5",
    title: "Family Tech Agreement",
    description: "Create and sign a personalized family technology agreement. Build shared expectations and mutual respect around device use.",
    duration: "3 days",
    iconName: "file-text",
    color: "#4A90A4",
    category: "Foundation",
    isPremium: false,
    steps: [
      "Review the sample rules together as a family",
      "Add, remove, or modify rules to fit your family",
      "Discuss consequences for breaking the agreement",
      "Have everyone sign (or thumbprint for younger kids!)",
      "Post the agreement somewhere visible in your home",
      "Review and update it every 3 months",
    ],
  },
  {
    id: "ch6",
    title: "Privacy Audit",
    description: "Spend an hour reviewing privacy settings on all family devices and accounts. A little time now protects your family's safety.",
    duration: "1 day",
    iconName: "lock",
    color: "#8E44AD",
    category: "Privacy",
    isPremium: true,
    steps: [
      "List all social media accounts your child has",
      "Review privacy settings on each account together",
      "Disable location sharing on apps that don't need it",
      "Check app permissions on phones and tablets",
      "Update any weak passwords",
      "Enable two-factor authentication on important accounts",
    ],
  },
];

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "aq1",
    question: "Does your child know not to share their home address online?",
    options: [
      { label: "Yes, we've discussed this clearly", score: 3 },
      { label: "I think so, but we haven't talked about it directly", score: 1 },
      { label: "I'm not sure", score: 0 },
      { label: "No, this hasn't come up", score: 0 },
    ],
    category: "Privacy",
  },
  {
    id: "aq2",
    question: "Does your child know how to block and report someone online?",
    options: [
      { label: "Yes, they know how on all their platforms", score: 3 },
      { label: "Yes, but only on some platforms", score: 2 },
      { label: "We've talked about it but haven't practiced", score: 1 },
      { label: "No, we haven't covered this", score: 0 },
    ],
    category: "Safety",
  },
  {
    id: "aq3",
    question: "Can your child identify a phishing or scam message?",
    options: [
      { label: "Yes, we've practiced identifying scams together", score: 3 },
      { label: "They have a general idea", score: 2 },
      { label: "We haven't specifically discussed this", score: 1 },
      { label: "No, I don't think they know what to look for", score: 0 },
    ],
    category: "Scams",
  },
  {
    id: "aq4",
    question: "Does your child feel comfortable coming to you if something uncomfortable happens online?",
    options: [
      { label: "Yes, they have come to me before and/or I'm confident they would", score: 3 },
      { label: "I think so, but I'm not certain", score: 2 },
      { label: "Probably not — they tend to handle things alone", score: 1 },
      { label: "No, they would likely not tell me", score: 0 },
    ],
    category: "Communication",
  },
  {
    id: "aq5",
    question: "Are your child's social media accounts set to private?",
    options: [
      { label: "Yes, all accounts are private and we review settings regularly", score: 3 },
      { label: "Yes, most are private", score: 2 },
      { label: "I'm not sure about all of them", score: 1 },
      { label: "No, or my child doesn't have social media yet", score: 0 },
    ],
    category: "Privacy",
  },
  {
    id: "aq6",
    question: "Does your family have agreed-upon screen time limits?",
    options: [
      { label: "Yes, we have clear limits that everyone follows", score: 3 },
      { label: "We have guidelines but they're not consistently enforced", score: 2 },
      { label: "We've talked about it but don't have firm limits", score: 1 },
      { label: "No, screen time is not currently limited", score: 0 },
    ],
    category: "Wellness",
  },
  {
    id: "aq7",
    question: "Does your child understand that online content can be permanent?",
    options: [
      { label: "Yes, we've had specific conversations about digital footprints", score: 3 },
      { label: "They have a general idea", score: 2 },
      { label: "Probably not fully", score: 1 },
      { label: "No, this hasn't been discussed", score: 0 },
    ],
    category: "Digital Footprint",
  },
  {
    id: "aq8",
    question: "Does your child know what to do if they see something inappropriate or harmful online?",
    options: [
      { label: "Yes, we have a clear plan they know well", score: 3 },
      { label: "They know to tell me, but we haven't detailed the steps", score: 2 },
      { label: "Probably not — this hasn't come up", score: 1 },
      { label: "No, we haven't discussed this", score: 0 },
    ],
    category: "Safety",
  },
  {
    id: "aq9",
    question: "Have you reviewed the age requirements for apps and platforms your child uses?",
    options: [
      { label: "Yes, I actively manage which apps they can use", score: 3 },
      { label: "I've checked some but not all", score: 2 },
      { label: "Not recently", score: 1 },
      { label: "No, I haven't checked platform age requirements", score: 0 },
    ],
    category: "Safety",
  },
  {
    id: "aq10",
    question: "Does your family have a technology agreement or shared device rules?",
    options: [
      { label: "Yes, we have a written or formal agreement", score: 3 },
      { label: "We have informal verbal rules", score: 2 },
      { label: "We've discussed rules but nothing formal", score: 1 },
      { label: "No, we don't have any formal agreement", score: 0 },
    ],
    category: "Communication",
  },
];

export const BADGES: Badge[] = [
  { id: "b1", title: "First Step", description: "Completed your first lesson", iconName: "star", color: "#F5A623", condition: "complete_first_lesson" },
  { id: "b2", title: "Quiz Master", description: "Passed 5 quizzes", iconName: "award", color: "#4A90A4", condition: "pass_5_quizzes" },
  { id: "b3", title: "Safety Scholar", description: "Completed the Cyberbullying course", iconName: "shield", color: "#3A7D6B", condition: "complete_course_c1" },
  { id: "b4", title: "Scam Buster", description: "Completed the Online Scam course", iconName: "alert-triangle", color: "#E07B39", condition: "complete_course_c2" },
  { id: "b5", title: "Digital Citizen", description: "Completed 3 courses", iconName: "globe", color: "#7B5EA7", condition: "complete_3_courses" },
  { id: "b6", title: "Challenge Champion", description: "Completed your first family challenge", iconName: "zap", color: "#F5A623", condition: "complete_first_challenge" },
  { id: "b7", title: "Privacy Pro", description: "Completed the Digital Footprints course", iconName: "lock", color: "#27AE60", condition: "complete_course_c6" },
  { id: "b8", title: "Screen Balance", description: "Completed the Screen-Free Saturday challenge", iconName: "sun", color: "#F39C12", condition: "complete_challenge_ch1" },
  { id: "b9", title: "Family First", description: "Completed the Family Tech Agreement challenge", iconName: "heart", color: "#E91E8C", condition: "complete_challenge_ch5" },
  { id: "b10", title: "Cyber Expert", description: "Completed all 8 courses", iconName: "cpu", color: "#2D7DD2", condition: "complete_all_courses" },
];

export const WEEKLY_TIPS: WeeklyTip[] = [
  {
    id: "wt1",
    title: "Start With Curiosity, Not Rules",
    content: "This week, ask your child to show you their favorite app or game. Let curiosity lead the conversation — you'll learn more about their digital world than any monitoring tool can show you.",
    category: "Connection",
    iconName: "search",
  },
  {
    id: "wt2",
    title: "The Charging Station Habit",
    content: "Place a family charging station outside all bedrooms. Phones charge there overnight — for everyone, including parents. Modeling the behavior you want is the most powerful parenting tool.",
    category: "Wellness",
    iconName: "battery-charging",
  },
  {
    id: "wt3",
    title: "Create a Safe Reporting Culture",
    content: "Tell your child: 'If anything ever makes you uncomfortable online, you can always come to me. You will never get in trouble for telling me.' Say it often. Make it true by staying calm when they do.",
    category: "Safety",
    iconName: "shield",
  },
  {
    id: "wt4",
    title: "Watch Something Together",
    content: "Co-viewing is powerful. When you watch content with your child, you open natural conversations about what they're seeing. Ask 'what do you think about that?' rather than lecturing.",
    category: "Connection",
    iconName: "tv",
  },
  {
    id: "wt5",
    title: "Privacy Settings Review",
    content: "Once a quarter, sit down with your child and review the privacy settings on their social media accounts together. Platforms change their settings frequently — what was private last month may not be now.",
    category: "Privacy",
    iconName: "lock",
  },
  {
    id: "wt6",
    title: "Celebrate Positive Online Behavior",
    content: "When you notice your child being kind online, handling conflict well, or making good digital decisions — celebrate it. Positive reinforcement builds the behavior you want to see more of.",
    category: "Wellness",
    iconName: "award",
  },
  {
    id: "wt7",
    title: "The Dinner Table Reconnect",
    content: "Start each family dinner with a simple question: 'What's something you saw or heard about today that made you think?' It opens the door to conversations about online experiences without making it feel like an interrogation.",
    category: "Connection",
    iconName: "coffee",
  },
  {
    id: "wt8",
    title: "Model Digital Boundaries",
    content: "Children learn from watching you. If you want them to put the phone down at dinner, do it yourself first. If you want them to ask before sharing photos, ask before sharing theirs. Be the digital citizen you want them to be.",
    category: "Wellness",
    iconName: "eye",
  },
];

export const AGE_BANDS = ["6-9", "10-13", "14-17"] as const;
export type AgeBand = typeof AGE_BANDS[number];

export const AGREEMENT_RULES = [
  { id: "r1", category: "Time", rule: "Screen time ends at least 1 hour before bedtime", ageBands: ["6-9", "10-13", "14-17"] },
  { id: "r2", category: "Time", rule: "No phones at the dinner table", ageBands: ["6-9", "10-13", "14-17"] },
  { id: "r3", category: "Time", rule: "Homework and chores come before screen time", ageBands: ["6-9", "10-13", "14-17"] },
  { id: "r4", category: "Safety", rule: "Never share home address, school name, or phone number online", ageBands: ["6-9", "10-13", "14-17"] },
  { id: "r5", category: "Safety", rule: "Tell a parent if anything or anyone online makes me uncomfortable", ageBands: ["6-9", "10-13", "14-17"] },
  { id: "r6", category: "Safety", rule: "No talking to strangers online without parent permission", ageBands: ["6-9", "10-13"] },
  { id: "r7", category: "Privacy", rule: "Ask before posting photos that include other family members", ageBands: ["10-13", "14-17"] },
  { id: "r8", category: "Privacy", rule: "All social media accounts stay on private settings", ageBands: ["10-13", "14-17"] },
  { id: "r9", category: "Respect", rule: "Treat others online the same way I would in person", ageBands: ["6-9", "10-13", "14-17"] },
  { id: "r10", category: "Respect", rule: "No recording or sharing images/videos of others without their permission", ageBands: ["10-13", "14-17"] },
  { id: "r11", category: "Devices", rule: "Devices stay in common areas, not bedrooms at night", ageBands: ["6-9", "10-13"] },
  { id: "r12", category: "Devices", rule: "Parents may review content on shared family devices", ageBands: ["6-9", "10-13"] },
];
