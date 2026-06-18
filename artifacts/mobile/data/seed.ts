export type LessonSection =
  | { type: "text"; heading?: string; content: string }
  | { type: "tip"; icon: string; content: string }
  | {
      type: "scenario";
      title: string;
      situation: string;
      options: string[];
      correct: number;
      explanation: string;
    };

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  content: string;
  duration: string;
  hasQuiz: boolean;
  // Rich, structured lesson body. When present, the lesson screen renders these
  // instead of splitting `content`. `content` stays as a plain-text fallback.
  sections?: LessonSection[];
  keyTakeaways?: string[];
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
  tips?: string[];
  successCriteria?: string;
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
        id: "c1l0",
        courseId: "c1",
        title: "What Is Cyberbullying — And How to Stop It",
        content: "Learn to recognize cyberbullying, understand why it happens, and know exactly what to do if you or a friend experiences it.",
        duration: "15 min",
        hasQuiz: true,
        sections: [
          {
            type: "text",
            heading: "What counts as cyberbullying?",
            content: `Cyberbullying is when someone uses technology — phones, apps, games, or the internet — to repeatedly hurt, embarrass, or threaten another person. It is different from a one-time argument or someone being rude once. The key word is 'repeatedly' — a pattern of mean behavior.\n\nExamples include: sending mean or threatening messages, posting embarrassing photos without permission, spreading rumors online, leaving someone out of group chats on purpose, creating fake accounts to mock someone, or flooding someone with hurtful comments.`,
          },
          {
            type: "tip",
            icon: "alert-circle",
            content: `One important fact: cyberbullying can happen 24/7. Unlike in-person bullying that ends when the school day does, online harassment can follow someone home, into their bedroom, and interrupt their sleep. This is why it can feel so overwhelming.`,
          },
          {
            type: "text",
            heading: "Why do people cyberbully?",
            content: `Understanding why helps us respond better. Common reasons include: wanting to feel powerful or in control, going along with a group (bystander pressure), jealousy, boredom, or personal pain that gets directed outward. Sometimes people act online in ways they never would face-to-face because screens make them feel anonymous and distant from consequences.\n\nThis does not excuse cyberbullying — but it helps explain it.`,
          },
          {
            type: "scenario",
            title: "What would you do?",
            situation: `Your 12-year-old says a classmate has been screenshot-ing her private messages and sharing them in a group chat, making fun of what she wrote. She begs you not to get her in trouble at school. What is the right first step?`,
            options: [
              "Tell her to block the classmate and not worry about it",
              "Take screenshots of the evidence, listen to her feelings, and ask what kind of support she wants before deciding next steps",
              "Immediately call the school principal",
              "Contact the other child's parents directly",
            ],
            correct: 1,
            explanation: `Documenting evidence first is critical — screenshots can disappear. Asking your child what support they want builds trust and gives you better information. Acting impulsively (calling the school or other parents right away without your child's input) can sometimes escalate the situation or damage your child's trust in you.`,
          },
          {
            type: "text",
            heading: "The 3-step response plan",
            content: `Step 1 — DOCUMENT: Screenshot and save everything before blocking anyone. Evidence is important if you need to involve school staff or authorities.\n\nStep 2 — DON'T RETALIATE: Responding with anger or insults gives the bully more ammunition and can make your child look equally at fault.\n\nStep 3 — REPORT: Use the platform's reporting tools. Most major platforms (Instagram, TikTok, Snapchat, Roblox) have one-tap reporting. For serious threats, contact school administrators or, if there are threats of violence, local law enforcement.`,
          },
          {
            type: "tip",
            icon: "heart",
            content: `For parents: the most important thing you can do is make home a safe place to talk. Children who feel they can tell a parent about cyberbullying without the device being taken away are far more likely to report it early.`,
          },
          {
            type: "text",
            heading: "Platform reporting — quick reference",
            content: `Instagram: Press and hold a comment → Report. For a post: tap the three dots → Report.\nTikTok: Long-press the comment or tap the share icon on a video → Report.\nSnapchat: Press and hold a message → Report or Block.\nRoblox: Click the flag icon on any player's profile.\nYouTube: Three dots next to a comment → Report.\n\nAll platforms are legally required to respond to reports involving minors.`,
          },
        ],
        keyTakeaways: [
          "Cyberbullying is repeated harmful behavior online — not a one-time rudeness",
          "Document before blocking — screenshots are your evidence",
          "Never retaliate — it escalates the situation",
          "Most platforms have one-tap reporting tools",
          "Open communication at home is the single most protective factor",
        ],
      },
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
        lessonId: "c1l0",
        questions: [
          {
            id: "c1l0q1",
            question: "What makes cyberbullying different from someone being rude to you once online?",
            options: ["Cyberbullying only happens on social media", "Cyberbullying is a repeated pattern of harmful behavior", "Cyberbullying always involves physical threats", "Cyberbullying only counts if it happens at school"],
            correctIndex: 1,
            explanation: "The key distinction is repetition. A one-time rude comment, while hurtful, is not cyberbullying. Cyberbullying is a sustained, repeated pattern of behavior intended to harm, embarrass, or threaten.",
          },
          {
            id: "c1l0q2",
            question: "Your child tells you they are being cyberbullied. What should you do FIRST?",
            options: ["Call the school immediately", "Take the device away so they cannot be reached", "Take screenshots to document the evidence before blocking anyone", "Contact the bully's parents"],
            correctIndex: 2,
            explanation: "Evidence documentation always comes first. Once you block a user, you may lose access to the evidence. Screenshots give you what you need to report to the platform, school, or authorities.",
          },
          {
            id: "c1l0q3",
            question: "Why is cyberbullying particularly harmful compared to in-person bullying?",
            options: ["It is not actually more harmful", "It can follow the victim home and happen 24/7", "It only affects teenagers", "It is easier to report than in-person bullying"],
            correctIndex: 1,
            explanation: "Traditional bullying stops at the school gates. Cyberbullying invades every safe space — home, bedroom, even sleep. This constant exposure is why cyberbullied children show higher rates of anxiety and depression than those experiencing in-person bullying alone.",
          },
          {
            id: "c1l0q4",
            question: "Which of these is the MOST protective thing a parent can do to help prevent and address cyberbullying?",
            options: ["Monitor every message your child sends", "Make home a safe place to talk without fear of device confiscation", "Install parental control software on all devices", "Have your child only talk to people they know in real life"],
            correctIndex: 1,
            explanation: "Research consistently shows that children who feel they can tell a parent about cyberbullying — without losing their devices — report it earlier and recover better. Fear of losing device access is one of the top reasons children stay silent.",
          },
          {
            id: "c1l0q5",
            question: "Which action should you AVOID when your child is being cyberbullied?",
            options: ["Documenting the evidence", "Reporting through the platform", "Responding to the bully with angry messages", "Talking to school staff"],
            correctIndex: 2,
            explanation: "Retaliating escalates the situation, can make your child appear equally at fault, and gives the bully more material to use. Never respond to a bully in anger.",
          },
        ],
      },
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
        id: "c2l0",
        courseId: "c2",
        title: "Scams, Schemes & Digital Traps",
        content: "Scammers specifically target young people. Learn the most common tricks used to steal money, passwords, and personal information — and how to spot them instantly.",
        duration: "18 min",
        hasQuiz: true,
        sections: [
          {
            type: "text",
            heading: "Why kids and teens are prime targets",
            content: `Scammers love targeting young people for a few reasons: young people are often more trusting, less experienced with financial deception, and more active online. Teens in particular are targeted by gaming scams, fake job offers, and social media prize scams. The FBI's Internet Crime Complaint Center reports that people under 20 lose millions of dollars to online fraud every year.\n\nThe good news: scams almost always follow predictable patterns. Once you know the patterns, they become easy to spot.`,
          },
          {
            type: "text",
            heading: "The 6 most common scams targeting young people",
            content: `1. FREE ROBUX / V-BUCKS SCAMS: Fake websites or accounts promise in-game currency in exchange for your login credentials. They take your account — not just your currency.\n\n2. FAKE JOB OFFERS: 'Make $500/week from home, no experience needed!' These scams are everywhere on Instagram and TikTok. They either ask for personal info, ask you to 'process payments' (money laundering), or charge a startup fee.\n\n3. ROMANCE SCAMS: A stranger builds a relationship over weeks or months before eventually asking for money, gift cards, or compromising photos.\n\n4. PRIZE / GIVEAWAY SCAMS: 'You've won an iPhone! Click here to claim.' The link steals your login or installs malware.\n\n5. PHISHING TEXTS AND EMAILS: Messages pretending to be from Apple, PayPal, your bank, or a streaming service saying your account is suspended — with a link to a fake login page.\n\n6. SOCIAL MEDIA IMPERSONATION: Someone creates a fake account of a friend or celebrity and messages you asking for money or Venmo payments.`,
          },
          {
            type: "tip",
            icon: "zap",
            content: `The Universal Scam Rule: If something creates urgency, promises something too good to be true, or asks for gift cards as payment — it is a scam. No legitimate business ever asks you to pay with iTunes gift cards.`,
          },
          {
            type: "scenario",
            title: "Scam or legit?",
            situation: `Your teenager gets a DM on Instagram from an account with 50,000 followers saying: 'Hey! We found your profile and think you'd be a perfect brand ambassador. We'll send you $200 Venmo just for posting one photo. Just DM us your Venmo username and confirm your email to get started.' What is this?`,
            options: [
              "A real brand ambassador opportunity — 50k followers means it's probably legit",
              "Possibly real — ask them to send a contract first",
              "A scam — they'll use the Venmo username and email to attempt account takeover or request money back via a fake 'overpayment' trick",
              "Hard to tell — DM them back and see what they say",
            ],
            correct: 2,
            explanation: `This is a classic influencer scam. The overpayment trick works like this: they 'send' you $300, then say it was a mistake and ask you to send back $200. The original payment was fraudulent and gets reversed, but the $200 you sent is real and gone. Follower counts mean nothing — they're bought. Legitimate brand deals always use official business email, not Instagram DMs.`,
          },
          {
            type: "text",
            heading: "How to verify before you click or share",
            content: `CHECK THE SENDER: Hover over email addresses (or press and hold on mobile) to see the real address. 'Apple Support' sent from apple-support-noreply@gmail.com is not Apple.\n\nSEARCH THE OFFER: Copy the message text and Google it with the word 'scam.' Most scams have been reported thousands of times.\n\nGO DIRECTLY: Instead of clicking a link in an email, go directly to the official website by typing it yourself.\n\nASK A PARENT: There is no shame in asking. Scammers are sophisticated professionals. Adults get fooled too.`,
          },
          {
            type: "tip",
            icon: "shield",
            content: `For parents: teach your kids that coming to you after almost falling for a scam is brave, not stupid. Shame keeps scam victims silent — and silence lets scammers win.`,
          },
        ],
        keyTakeaways: [
          "Urgency + too-good-to-be-true + gift card payment = always a scam",
          "Free gaming currency scams steal your entire account, not just add currency",
          "Verify by going directly to websites — never through links in messages",
          "Search the offer text + the word scam before responding to anything",
          "Talking about it isn't embarrassing — scammers are professionals",
        ],
      },
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
        lessonId: "c2l0",
        questions: [
          {
            id: "c2l0q1",
            question: "You receive a text saying 'Your Netflix account has been suspended. Click here to restore access.' What is the safest response?",
            options: ["Click the link to see if it is real", "Go directly to netflix.com by typing it yourself and check your account there", "Reply STOP to unsubscribe", "Forward it to a friend to check"],
            correctIndex: 1,
            explanation: "Never click links in unsolicited messages. Always navigate directly to the official website by typing the URL yourself. If your account was actually suspended, you will see that when you log in normally.",
          },
          {
            id: "c2l0q2",
            question: "A gaming website promises free Robux if you enter your Roblox username and password. What will actually happen?",
            options: ["You will receive free Robux", "Nothing — it is just a broken link", "Your account will be stolen and potentially sold", "You will receive a survey"],
            correctIndex: 2,
            explanation: "Free currency scams exist solely to steal account credentials. Once they have your username and password, they lock you out, steal your items, and often sell the account. Roblox never gives free currency through third-party websites.",
          },
          {
            id: "c2l0q3",
            question: "What payment method is ALWAYS a sign of a scam?",
            options: ["Credit card", "PayPal", "Gift cards (iTunes, Google Play, Amazon)", "Bank transfer to a known company"],
            correctIndex: 2,
            explanation: "No legitimate business, government agency, or employer ever asks to be paid in gift cards. Gift card payments are irreversible and untraceable — exactly what scammers want. This is true 100% of the time.",
          },
          {
            id: "c2l0q4",
            question: "An Instagram account with 50,000 followers offers your teenager $200 to post a photo. They ask for your Venmo username to 'send the payment.' What is this?",
            options: ["A real opportunity — large follower counts mean legitimacy", "A scam using the overpayment trick", "Harmless — giving a Venmo username is safe", "A real offer that needs a contract first"],
            correctIndex: 1,
            explanation: "This is the overpayment scam. They send a fraudulent payment, then ask you to return part of it. When their payment reverses, your money is gone. Follower counts are purchased and meaningless. Legitimate brand deals come through official business channels, not Instagram DMs.",
          },
          {
            id: "c2l0q5",
            question: "You are suspicious about an offer you received online. What is the fastest way to check if it is a scam?",
            options: ["Ask the sender directly", "Look it up on Wikipedia", "Copy the key phrases and Google them with the word 'scam'", "Check if the website has a padlock icon"],
            correctIndex: 2,
            explanation: "Most scam messages are sent to thousands of people. A quick Google search of the message text plus the word 'scam' almost always reveals whether others have reported the same scheme. The padlock icon (HTTPS) only means data is encrypted — it does not mean the site is trustworthy.",
          },
        ],
      },
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
        id: "c3l0",
        courseId: "c3",
        title: "Is Your Child Ready for Social Media?",
        content: "A practical, research-backed guide to evaluating social media readiness by age — and how to set up their first account for success, not disaster.",
        duration: "20 min",
        hasQuiz: false,
        sections: [
          {
            type: "text",
            heading: "The real question isn't age — it's readiness",
            content: `Most platforms require users to be 13+ under COPPA (the Children's Online Privacy Protection Act). But age alone is a poor predictor of readiness. A mature 12-year-old may handle social media better than an impulsive 15-year-old. Readiness involves emotional regulation, critical thinking, understanding of privacy, and the ability to handle social comparison and rejection.\n\nResearch from the American Psychological Association (2023) found that adolescents who had conversations with parents about social media use before getting accounts reported higher wellbeing and better coping strategies than those who simply received access.`,
          },
          {
            type: "text",
            heading: "Readiness checklist by age band",
            content: `AGES 10–12 (pre-social media prep):\n• Can they handle not getting a 'like' without emotional distress?\n• Do they understand that online posts are permanent and public even if deleted?\n• Can they identify when someone is being unkind vs. just disagreeing?\n• Do they know what personal information should never be shared (address, school name, phone number)?\n\nAGES 13–14 (starter accounts):\n• Do they understand that people curate highlight reels — not real life?\n• Can they block and report without feeling guilty?\n• Do they know how to set an account to private?\n• Can they have a conversation with you about something uncomfortable they see online?\n\nAGES 15–17 (expanding access):\n• Do they think before posting — imagining how it might look in 10 years?\n• Can they recognize when a platform is negatively affecting their mood?\n• Do they understand the difference between a public and private digital footprint?\n• Can they identify misinformation?`,
          },
          {
            type: "tip",
            icon: "users",
            content: `The 'Front Page Test': Before posting anything, ask: 'Would I be comfortable if this appeared on the front page of my school newsletter and my grandparents could see it?' If not, don't post it.`,
          },
          {
            type: "scenario",
            title: "Setting up their first account",
            situation: `Your 13-year-old wants an Instagram account. They're responsible, get good grades, and have good friendships. What's the best approach to setting it up?`,
            options: [
              "Let them set it up themselves — they're old enough",
              "Set it up together, go through all privacy settings, discuss your household rules, follow each other, and check in monthly",
              "Say no until they're 16",
              "Allow it but install a parental monitoring app to see everything they post",
            ],
            correct: 1,
            explanation: `Setting up the account together is the research-backed approach. Going through privacy settings together teaches skills, not just imposes rules. Following each other maintains connection without surveillance. Monthly check-ins keep the conversation open. Secret monitoring apps damage trust if discovered — and they always are eventually.`,
          },
          {
            type: "text",
            heading: "The 5 conversations to have before first login",
            content: `1. WHAT WE SHARE AND DON'T SHARE: Full name, school, location, home address, and daily schedule are off-limits. Discuss this specifically, not just 'be careful.'\n\n2. HOW TO HANDLE STRANGERS: Anyone they don't know in real life who tries to become close online should be told to a parent immediately — no exceptions.\n\n3. THE PERMANENCE PRINCIPLE: Once something is posted, assume it exists forever, even if deleted. Screenshots exist.\n\n4. THE COMPARISON TRAP: Social media shows highlights. No one posts their bad days, boring days, or insecurities. Comparing your behind-the-scenes to everyone else's highlight reel is a losing game.\n\n5. THE OPEN DOOR: If they ever see something that makes them uncomfortable, confused, or scared — there will be no device confiscation. You will help them handle it together.`,
          },
        ],
        keyTakeaways: [
          "Readiness is about emotional and critical thinking skills — not just age",
          "Set up first accounts together, not independently",
          "Privacy settings should be reviewed together and revisited every 6 months",
          "The open door conversation is the most protective thing a parent can do",
          "Social comparison is built into platform design — teach kids to recognize it",
        ],
      },
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
        id: "c4l0",
        courseId: "c4",
        title: "Online Predators: What Parents and Kids Must Know",
        content: "Clear, non-alarmist guidance on grooming tactics, warning signs, and how to create a family culture where children feel safe reporting concerns.",
        duration: "22 min",
        hasQuiz: false,
        sections: [
          {
            type: "text",
            heading: "Understanding grooming — how it actually works",
            content: `Online grooming is a process, not a single event. It typically follows a predictable pattern over weeks or months:\n\n1. TARGETING: Predators look for children who seem lonely, have family conflict, or are seeking attention and validation online.\n\n2. GAINING TRUST: They present themselves as uniquely understanding — 'I'm the only one who really gets you.' They shower the child with attention, compliments, and gifts (gaming currency, gift cards).\n\n3. ISOLATION: They gradually separate the child from friends and family — 'Your parents just don't understand us. Our friendship is special.'\n\n4. DESENSITIZATION: They introduce sexual topics gradually — starting with jokes, then images, then requests.\n\n5. MAINTAINING SECRECY: By the time a request for images or a meeting is made, they've often convinced the child that the 'relationship' must be kept secret because adults 'wouldn't understand.'`,
          },
          {
            type: "tip",
            icon: "alert-triangle",
            content: `Key insight: Most children who experience online grooming do not recognize it as such while it is happening. They believe they are in a genuine friendship or relationship. This is why 'stranger danger' messaging alone is insufficient — predators are skilled at becoming familiar and trusted.`,
          },
          {
            type: "text",
            heading: "Warning signs to watch for",
            content: `Behavioral changes in your child:\n• Secretive about online activity — closes laptop or turns phone over when you enter the room\n• Receives calls or messages late at night\n• Switches screens or hides their phone quickly when you approach\n• Uses devices at unusual hours\n• Withdraws from family and friends they were previously close to\n• Receives unexplained gifts — gaming credits, gift cards, packages\n• Uses sexual language or references they wouldn't have encountered age-appropriately\n• Seems emotionally disturbed or anxious after being online\n\nNote: These behaviors can have innocent explanations (normal teenage privacy). The concern rises when multiple signs appear together or when they change suddenly.`,
          },
          {
            type: "scenario",
            title: "How to respond — not react",
            situation: `Your 14-year-old mentions that an 'online friend' they play games with has been asking a lot of personal questions and wants to video call. Your child seems excited about the friendship. What do you do?`,
            options: [
              "Take the device away immediately and end all online gaming",
              "Stay calm, express interest rather than alarm, ask curious questions about this friend, and review the conversation history together without judgment",
              "Tell them only creeps make friends online",
              "Allow it — gaming friendships are normal",
            ],
            correct: 1,
            explanation: `Reacting with alarm or punishment causes children to hide information from you — which is exactly what a predator wants. Expressing genuine curiosity ('Tell me about them — how long have you been talking? What do you talk about?') keeps the conversation open. Reviewing the conversation history together, framed as 'help me understand your friendship,' gives you the information you need while preserving trust.`,
          },
          {
            type: "text",
            heading: "The safety conversations that actually work",
            content: `TEACH THE PATTERN, NOT JUST THE RULE: Instead of 'never talk to strangers online,' teach children what grooming looks like: 'If someone you met online is asking you to keep your friendship secret, wants you to feel like they understand you better than we do, or is asking for photos — that's a sign to tell me immediately. I promise I will not be angry at you.'\n\nPRACTICE THE SCRIPT: Teach kids what to say: 'I need to tell my parents before we video call or meet.' A good person will accept this. Someone who pushes back or gets angry at that request is showing you who they are.\n\nNO-PUNISHMENT PROMISE: Make an explicit promise: 'If someone makes you uncomfortable online, or if you accidentally got into a situation you didn't expect — you can tell me and I will not punish you or take your devices. I will only help you.'`,
          },
          {
            type: "tip",
            icon: "phone",
            content: `Report suspected predator contact: National Center for Missing and Exploited Children CyberTipline at cybertipline.org or 1-800-843-5678. FBI at tips.fbi.gov. You can also report directly to the platform.`,
          },
        ],
        keyTakeaways: [
          "Grooming is a slow process — children rarely recognize it while it is happening",
          "Secretive device behavior + unexplained gifts + withdrawal are key warning signs",
          "Reacting with anger or punishment closes the door on future disclosures",
          "Teach children the pattern of grooming, not just 'don't talk to strangers'",
          "A no-punishment promise is the most powerful safety tool a parent has",
        ],
      },
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
        id: "c5l0",
        courseId: "c5",
        title: "AI in Your Child's World: Opportunities and Risks",
        content: "From ChatGPT to deepfakes to AI companions — what every parent needs to understand about artificial intelligence, and how to guide kids to use it responsibly.",
        duration: "18 min",
        hasQuiz: false,
        sections: [
          {
            type: "text",
            heading: "AI is already part of your child's life",
            content: `Whether you've had a conversation about it or not, your child is almost certainly using AI tools. Studies show over 60% of students aged 13–18 have used ChatGPT or a similar tool. They're using it for homework help, creative writing, answering questions, and entertainment.\n\nAI tools are also embedded in platforms they already use: TikTok's recommendation algorithm, Snapchat's My AI, Instagram's content moderation, and video games with AI-generated characters. Understanding AI isn't optional anymore — it's a core digital literacy skill.`,
          },
          {
            type: "text",
            heading: "The real risks parents should know about",
            content: `1. DEEPFAKES: AI can now generate realistic fake photos, videos, and audio of real people. 'Deepfake pornography' targeting minors — taking a real photo of a teenager and digitally manipulating it — is a growing and devastating form of image-based abuse. Teach children: never share photos with someone they don't know in person.\n\n2. AI COMPANIONS: Apps like Replika and Character.AI allow children to form emotional bonds with AI chatbots. While not inherently harmful, unmoderated AI companions have been known to engage in inappropriate conversations with minors and, in extreme cases, have been linked to emotional dependency.\n\n3. AI-GENERATED MISINFORMATION: AI can produce convincing fake news articles, fake social media posts, and fake images of events that never happened. Teach: check primary sources before sharing anything surprising or alarming.\n\n4. ACADEMIC DISHONESTY: Using AI to complete assignments without disclosure has real consequences for learning and integrity. Establish family expectations about appropriate AI use for schoolwork.`,
          },
          {
            type: "tip",
            icon: "cpu",
            content: `For kids: AI is a tool, not a friend. If an AI chatbot is saying things that make you uncomfortable, screenshot it and tell a parent. You won't be in trouble — the app is doing something it shouldn't.`,
          },
          {
            type: "scenario",
            title: "Navigating AI homework help",
            situation: `Your 15-year-old says all their friends use ChatGPT for homework and asks why they can't too. How do you respond?`,
            options: [
              "Absolutely not — it's cheating",
              "Yes, use it however you want",
              "Discuss the difference between using AI as a tutor (explain a concept, check understanding, give feedback on drafts) vs. using it as a ghostwriter (do the work for me). Set a family rule about disclosure.",
              "Only use it if the teacher doesn't find out",
            ],
            correct: 2,
            explanation: `The most effective approach addresses why the distinction matters, not just whether it's allowed. Using AI to understand a concept, get feedback, or brainstorm builds skills. Using it to generate final work you submit as your own stunts learning and is dishonest. Many schools are now explicitly teaching AI literacy — knowing how to use AI well is itself a skill worth developing correctly.`,
          },
          {
            type: "text",
            heading: "Spotting AI-generated content",
            content: `Teach your child these practical checks:\n\nFOR IMAGES: Look for distorted hands or fingers (AI struggles with hands), asymmetrical features, background elements that don't make sense, unnaturally perfect skin, and artifacts around hair. Use Google Reverse Image Search.\n\nFOR TEXT: AI-generated text often sounds fluent but weirdly generic. It rarely contains specific personal anecdotes, tends to be balanced to the point of wishy-washiness, and may include plausible-sounding but incorrect facts. Always verify specific claims with a primary source.\n\nFOR VIDEO: Deepfake videos often have unnatural blinking, lighting that doesn't match the background, or audio that doesn't perfectly sync with lip movements.`,
          },
        ],
        keyTakeaways: [
          "Over 60% of teens already use AI tools — the conversation starts now",
          "Deepfakes targeting minors are a growing and serious threat",
          "AI companions can create unhealthy emotional dependency in vulnerable teens",
          "Use AI as a tutor, not a ghostwriter — the distinction shapes learning",
          "Practical deepfake detection skills are now a core digital literacy",
        ],
      },
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
        id: "c6l0",
        courseId: "c6",
        title: "Your Digital Footprint: What You Leave Behind",
        content: "Everything posted online creates a permanent record that can affect college admissions, job opportunities, and relationships. Learn how to manage it intentionally.",
        duration: "15 min",
        hasQuiz: true,
        sections: [
          {
            type: "text",
            heading: "What is a digital footprint?",
            content: `A digital footprint is the trail of data you leave behind whenever you use the internet. It has two parts:\n\nACTIVE FOOTPRINT: Things you deliberately post — social media, comments, photos, reviews, blog posts, and forum threads. You created these intentionally.\n\nPASSIVE FOOTPRINT: Data collected without you necessarily knowing — your browsing history, location data, what you searched for, how long you hovered over an ad, app permissions you've granted.\n\nBoth are stored, potentially forever, and can be accessed by future employers, college admissions officers, law enforcement, and anyone who knows how to look.`,
          },
          {
            type: "tip",
            icon: "search",
            content: `Try this: Google yourself right now. Then Google your child's full name. What comes up? This is what a college admissions officer, future employer, or anyone else sees. Do it once a year as a family digital health check.`,
          },
          {
            type: "text",
            heading: "Real consequences — not scare tactics",
            content: `These are documented, real cases (names omitted):\n\n• A 17-year-old lost a full scholarship after a university discovered racist tweets from two years earlier.\n• A college freshman's acceptance was rescinded when their private Facebook group — shared with 100 people — was screenshotted and sent to the admissions office.\n• A teenager who made a joke post about calling in a bomb threat 'as a meme' was arrested and charged.\n• An adult's job offer was withdrawn after the employer found photos from a company holiday party four years prior.\n\nNone of these people thought what they were doing would matter. That's exactly the problem.`,
          },
          {
            type: "scenario",
            title: "The 10-year rule",
            situation: `A 14-year-old is about to post a funny video mocking a teacher behind their back. Their friends think it's hilarious. They ask you if it's okay. What do you say?`,
            options: [
              "Sure, it's just a joke — everyone does it",
              "Apply the 10-year rule: imagine yourself at 24, showing this video to a job interviewer. Would you be comfortable? If not, don't post it.",
              "No — never post anything negative online ever",
              "It's fine as long as the teacher doesn't find out",
            ],
            correct: 1,
            explanation: `The 10-year rule is a practical heuristic that works because it makes the abstraction concrete. It's not about being a perfect person online — it's about recognizing that your future self will have to live with what your current self posts. The video might get 200 likes today. It could cost a job offer in 10 years.`,
          },
          {
            type: "text",
            heading: "Managing your digital footprint",
            content: `AUDIT STEP 1 — SEARCH YOURSELF: Google your full name and your username. Check image results.\n\nAUDIT STEP 2 — REVIEW OLD POSTS: Most platforms let you see your post history. Scroll back to posts from 2+ years ago with fresh eyes.\n\nAUDIT STEP 3 — CHECK APP PERMISSIONS: Go to phone settings → Privacy. See which apps have access to your camera, microphone, location, and contacts. Revoke anything you don't actively use.\n\nAUDIT STEP 4 — PRIVACY SETTINGS REVIEW: Set social media profiles to private. Remove your birthdate, phone number, and hometown from public profiles.\n\nMake this a family activity every 6 months.`,
          },
        ],
        keyTakeaways: [
          "Digital footprints include both what you post and what platforms collect passively",
          "'Deleted' posts are often not truly gone — screenshots last forever",
          "College admissions officers and employers routinely search candidates online",
          "The 10-year rule: would your 24-year-old self be comfortable with this post?",
          "Annual digital audits are as important as annual checkups",
        ],
      },
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
        lessonId: "c6l0",
        questions: [
          {
            id: "c6l0q1",
            question: "What is the difference between an active and a passive digital footprint?",
            options: ["There is no difference", "Active is what you post deliberately; passive is data collected about you without your direct action", "Active is on social media; passive is on websites", "Passive footprints are always deleted automatically"],
            correctIndex: 1,
            explanation: "Your active footprint is what you intentionally create — posts, comments, photos. Your passive footprint is data gathered as you browse — search history, location, app activity. Both are stored and can be accessed by others.",
          },
          {
            id: "c6l0q2",
            question: "Your teenager wants to delete an embarrassing post they made last year. What should they understand?",
            options: ["Deleting it removes it completely from the internet", "It is fine because no one saw it", "Deleting it does not guarantee it is gone — screenshots and archives may exist", "Only the platform owner can see deleted posts"],
            correctIndex: 2,
            explanation: "Deleting a post removes it from your profile, but if anyone screenshotted it, shared it, or if it was archived, it can still exist. The safest assumption is that anything posted is permanent.",
          },
          {
            id: "c6l0q3",
            question: "What is the '10-year rule' for posting online?",
            options: ["You must keep posts for 10 years", "Imagine how a post would look to you (or an employer) 10 years from now before posting", "Posts disappear after 10 years", "You can only post once every 10 days"],
            correctIndex: 1,
            explanation: "The 10-year rule asks you to picture your future self — at a job interview, applying to college — viewing this post. It turns an abstract risk into a concrete, relatable decision.",
          },
          {
            id: "c6l0q4",
            question: "What is a good family practice for managing digital footprints?",
            options: ["Never use the internet", "Conduct a digital audit together every 6 months — search yourselves, review old posts, check privacy settings", "Only the parents need to check their footprints", "Delete all social media accounts"],
            correctIndex: 1,
            explanation: "A regular family digital audit — searching your names, reviewing old content, checking app permissions and privacy settings — keeps everyone's footprint intentional and healthy. Doing it together makes it a normal, shared habit rather than surveillance.",
          },
          {
            id: "c6l0q5",
            question: "Why does a positive digital footprint matter, not just avoiding a negative one?",
            options: ["It does not — only deleting bad content matters", "Colleges and employers increasingly look you up online, so thoughtful posts, projects, and interests can become an asset", "A positive footprint makes your account harder to hack", "Positive posts are automatically deleted after a year"],
            correctIndex: 1,
            explanation: "A digital footprint is not only about damage control. Colleges and employers regularly search applicants, so deliberately sharing genuine interests, achievements, and projects builds a footprint that works in your favor rather than against you.",
          },
        ],
      },
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
        id: "c7l0",
        courseId: "c7",
        title: "Gaming Safety: Protecting Your Child in Online Games",
        content: "Online gaming is where many children first encounter strangers, spend real money, and face peer pressure. Here's everything parents need to know.",
        duration: "16 min",
        hasQuiz: true,
        sections: [
          {
            type: "text",
            heading: "Why gaming is a unique digital safety concern",
            content: `Online games are social platforms. Fortnite, Roblox, Minecraft, Call of Duty, and Valorant all allow real-time voice and text chat with strangers. Unlike social media — where your child's connections are usually people they know — gaming lobbies can put your child in a voice chat with dozens of anonymous strangers instantly.\n\nThis creates risks that are different from social media: stranger contact happens in real time, children are often focused on the game and less guarded, and the social dynamics of gaming (teamwork, competition) create emotional openings that can be exploited.`,
          },
          {
            type: "text",
            heading: "Financial risks: microtransactions and loot boxes",
            content: `The gaming industry generated over $110 billion from in-game purchases in 2023. Many of these are intentionally designed to be psychologically compelling to children.\n\nLOOT BOXES: You pay real money for a randomized reward. Many countries have classified loot boxes as gambling. Children as young as 7 have spent hundreds or thousands of dollars through saved payment methods without parental awareness.\n\nMICROTRANSACTIONS: Small purchases ($1–$20) that add up. A child spending $3 on a Fortnite skin three times a week spends $468 per year.\n\nPRACTICAL RULE: Remove saved payment methods from gaming platforms. Use gift cards with a set monthly amount instead. This teaches budgeting and prevents accidental overspending.`,
          },
          {
            type: "tip",
            icon: "dollar-sign",
            content: `Check this right now: Go to your Apple ID → Payment & Shipping → Make sure 'Ask to Buy' is turned on for your child's account. On Android: Google Play → Settings → Parental controls → Require authentication for purchases.`,
          },
          {
            type: "scenario",
            title: "Voice chat with strangers",
            situation: `Your 10-year-old is playing Roblox and mentions that 'a really nice older kid' has been helping them through levels and wants to be their 'gaming buddy' across multiple games. What do you do?`,
            options: [
              "It's fine — gaming buddies are normal",
              "Ban all online gaming immediately",
              "Calmly ask to see the chat history, explain why cross-platform contact with older strangers is a concern, and review Roblox privacy settings together to disable contact from non-friends",
              "Tell them only to play with kids from school",
            ],
            correct: 2,
            explanation: `An older player who befriends a younger child and immediately wants to move the relationship to other platforms is a grooming warning sign. Calmly reviewing the conversation (without alarm) helps you assess the situation. Adjusting privacy settings together teaches the child WHY these settings matter, not just imposing rules. Roblox allows you to restrict chat to pre-approved friends only.`,
          },
          {
            type: "text",
            heading: "Gaming health: screens, sleep, and behavior",
            content: `SLEEP: Blue light from screens suppresses melatonin. Gaming within 1 hour of bedtime is associated with later sleep onset and worse sleep quality in children. Set a device curfew that accounts for wind-down time.\n\nGAMING ADDICTION SIGNS: Thinking about gaming constantly when not playing, lying about gaming time, choosing gaming over previously enjoyed activities, extreme anger or distress when gaming is interrupted, declining grades or hygiene.\n\nNOTE: Gaming in moderation is not harmful. Social gaming builds real friendships and problem-solving skills. The goal is balance, not elimination.`,
          },
        ],
        keyTakeaways: [
          "Online games are social platforms — children interact with strangers in real time",
          "Loot boxes and microtransactions are designed to exploit children's psychology",
          "Remove saved payment methods; use prepaid gift cards for gaming budgets",
          "Cross-game contact from older strangers is a grooming warning sign",
          "Gaming in moderation is healthy; watch for behavioral signs of problematic use",
        ],
      },
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
        lessonId: "c7l0",
        questions: [
          {
            id: "c7l0q1",
            question: "Why are online games a unique digital safety concern compared to social media?",
            options: ["Games are more expensive", "Games put children in real-time voice/text chat with anonymous strangers while they are focused on playing", "Games are only played by young children", "Games never have chat features"],
            correctIndex: 1,
            explanation: "Online games are social platforms where children interact with strangers in real time. Because the child is focused on the game, they are often less guarded — and teamwork dynamics create emotional openings that can be exploited.",
          },
          {
            id: "c7l0q2",
            question: "What is the safest way to handle in-game purchases for a child?",
            options: ["Save your credit card so purchases are quick", "Remove saved payment methods and use prepaid gift cards with a set monthly amount", "Let the child buy whatever they want", "Never let the child play any game with purchases"],
            correctIndex: 1,
            explanation: "Removing saved payment methods prevents accidental or impulsive overspending. Prepaid gift cards with a fixed monthly budget teach money management while capping the financial risk from loot boxes and microtransactions.",
          },
          {
            id: "c7l0q3",
            question: "An older player your child met in a game wants to become their 'gaming buddy' across multiple other platforms. What is this a potential sign of?",
            options: ["A normal, healthy friendship", "A grooming warning sign that warrants a calm conversation and privacy review", "Nothing to worry about", "A reason to ban all gaming permanently"],
            correctIndex: 1,
            explanation: "An older player who befriends a younger child and quickly tries to move the relationship across platforms is a recognized grooming pattern. The right response is a calm conversation, reviewing chat history together, and tightening privacy settings — not panic or punishment.",
          },
          {
            id: "c7l0q4",
            question: "Which of these is a warning sign of problematic gaming use?",
            options: ["Playing for one hour after homework", "Enjoying games with friends on weekends", "Extreme anger when gaming is interrupted, lying about gaming time, and declining grades", "Talking about a game they like"],
            correctIndex: 2,
            explanation: "Gaming in moderation is healthy. The warning signs are behavioral: constant preoccupation, lying about time spent, choosing gaming over previously enjoyed activities, extreme distress when interrupted, and declining grades or hygiene.",
          },
          {
            id: "c7l0q5",
            question: "What is the most effective way to set healthy gaming boundaries with your child?",
            options: ["Ban gaming entirely with no discussion", "Secretly monitor their play and confiscate the device when they break a rule", "Agree on clear limits together in advance and use the game's own parental controls and play-time tools", "Let them self-regulate with no limits at all"],
            correctIndex: 2,
            explanation: "Boundaries work best when they are agreed on together before conflict arises. Pairing a shared agreement with the platform's built-in parental controls and play-time limits makes the rules predictable and enforceable without surveillance or sudden punishment.",
          },
        ],
      },
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
        id: "c8l0",
        courseId: "c8",
        title: "Healthy Screen Habits for the Whole Family",
        content: "Screen time isn't just about hours — it's about how, when, and why. Practical strategies for building a healthy digital lifestyle that actually sticks.",
        duration: "14 min",
        hasQuiz: false,
        sections: [
          {
            type: "text",
            heading: "The screen time debate — what the research actually says",
            content: `The American Academy of Pediatrics updated its screen time guidance in 2023 to move away from simple hour limits toward a focus on content quality and context. The key finding: it's not just HOW MUCH screen time, but WHAT kind and WHETHER it displaces other important activities.\n\nSCREEN TIME THAT IS FINE: Video calls with family, educational content, creative tools (drawing apps, coding games), social gaming with known friends.\n\nSCREEN TIME TO MONITOR: Passive consumption (scrolling feeds, watching others play games), social media apps, content that generates strong emotional reactions.\n\nSCREEN TIME TO LIMIT BEFORE BED: Any screen within 1 hour of bedtime affects sleep quality across all age groups.`,
          },
          {
            type: "text",
            heading: "Building a family media plan",
            content: `A media plan isn't a punishment — it's a framework your family agrees on together. The most effective plans are co-created with children (even young ones), not imposed on them.\n\nKEY ELEMENTS OF A MEDIA PLAN:\n\n1. DEVICE-FREE ZONES: Choose 2–3 spaces in your home that are device-free (dining table, bedrooms after 9pm, the first 30 minutes after school). Post this visibly.\n\n2. TECH-FREE TIMES: Designate times, not just places. Dinner is the most researched — families that eat together without devices have children with significantly better communication skills and lower rates of substance use.\n\n3. CHARGE STATIONS: All family devices (including parents') charge in a common area overnight — not bedrooms.\n\n4. BALANCE BEFORE SCREENS: Homework done, outdoor time had, chores complete before leisure screen time begins.`,
          },
          {
            type: "tip",
            icon: "sun",
            content: `The 1-to-1 Rule for younger children: For every hour of leisure screen time, 1 hour of non-screen activity (outdoor play, reading, creative play, social time). This isn't punishment — it's balance-building. Make the non-screen activity genuinely fun and the rule becomes self-enforcing.`,
          },
          {
            type: "scenario",
            title: "The bedtime phone battle",
            situation: `Every night at 10pm there's a fight about your 13-year-old keeping their phone. They say they need it for their alarm. You're exhausted from the nightly conflict. What's the most effective long-term solution?`,
            options: [
              "Give in — it's not worth the fight",
              "Take the phone at 9pm every night no matter what",
              "Buy a $5 alarm clock, make a household rule that ALL family phones (including yours) charge in the kitchen overnight, and involve your child in setting the handover time so they have some ownership",
              "Install parental controls that cut off access at 10pm",
            ],
            correct: 2,
            explanation: `The most effective solution solves the stated problem (alarm), removes the double standard (parents also comply), and gives the child partial ownership (they choose between 9:30 and 10:00). Rules that apply to the whole family have dramatically better compliance than rules that single out children. The $5 alarm clock eliminates the most common objection.`,
          },
          {
            type: "text",
            heading: "Modeling the behavior you want to see",
            content: `Studies consistently show that parental screen behavior is the strongest predictor of children's screen behavior. Children whose parents use devices at dinner are 3x more likely to exceed recommended screen time. Children who see parents read books are more likely to read.\n\nThis isn't a guilt trip — it's an opportunity. You have enormous influence. A simple phrase: 'I'm putting my phone down while we talk' models exactly the skill you want your child to develop.\n\nFamily tech agreements (which you can build right in this app) work best when parents sign them too.`,
          },
        ],
        keyTakeaways: [
          "Screen time quality and context matter more than raw hours",
          "Device-free zones and times work best when co-created with children",
          "All family devices (including parents') should charge outside bedrooms",
          "Parental modeling is the strongest predictor of children's screen habits",
          "A $5 alarm clock eliminates the most common bedtime phone objection",
        ],
      },
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
    description: "Spend one entire Saturday without recreational screens — no social media, no gaming, no streaming. Phones for calls and navigation are allowed. Discover what your family does when screens disappear.",
    duration: "1 day",
    iconName: "sun",
    color: "#F39C12",
    category: "Wellness",
    isPremium: false,
    steps: [
      "Plan activities in advance so no one is bored",
      "Put all devices in a charging station first thing in the morning",
      "Cook a meal together as a family",
      "Spend at least 2 hours outdoors",
      "Reflect together at the end of the day on how it felt",
    ],
    tips: [
      "Plan activities in advance so no one is bored — boredom is when people reach for devices",
      "Prepare a 'boredom box' with board games, craft supplies, or books",
      "Cook a meal together — it naturally fills 2–3 hours",
      "Go outside for at least 2 hours",
      "Tell extended family so they don't expect immediate text replies",
    ],
    successCriteria: "All participating family members check in at end of day confirming no recreational screens.",
  },
  {
    id: "ch2",
    title: "Dinner Without Devices",
    description: "Keep all devices off the table and in another room for every dinner this week. No checking phones between bites. Just conversation.",
    duration: "7 days",
    iconName: "coffee",
    color: "#27AE60",
    category: "Wellness",
    isPremium: false,
    steps: [
      "Set up a basket in the hallway for everyone's phones",
      "Hold device-free dinners every night this week",
      "Use conversation starters if silence feels awkward at first",
      "Let kids lead the conversation topics some nights",
      "Notice how dinner feels by day 7 compared to day 1",
    ],
    tips: [
      "Put a basket in the hallway — everyone deposits their phone before sitting down",
      "Prepare conversation starter cards if silence feels awkward at first",
      "Make an exception for genuine emergencies only",
      "Let kids lead the conversation topics some nights",
      "Notice how different dinner feels by day 7 compared to day 1",
    ],
    successCriteria: "Check in after each dinner confirming devices stayed out of the room.",
  },
  {
    id: "ch3",
    title: "7-Day Outdoor Challenge",
    description: "Get outside for at least 30 minutes every day for a week. Walk, bike, play, garden — anything counts as long as it is outdoors.",
    duration: "7 days",
    iconName: "map-pin",
    color: "#3A7D6B",
    category: "Wellness",
    isPremium: true,
    steps: [
      "Commit to at least 30 minutes outdoors every day",
      "Try a different outdoor activity each day",
      "Invite a neighbor or friend to join for accountability",
      "Take photos of things you notice outside",
      "Check in each day with your outdoor activity",
    ],
    tips: [
      "It does not need to be a hike — a walk around the block counts",
      "Invite a neighbor or friend to join for accountability",
      "Take photos of things you notice outside — clouds, birds, interesting plants",
      "Try a different outdoor activity each day",
      "Going outside in rain is extra points for bravery",
    ],
    successCriteria: "At least one family member checks in each day with their outdoor activity.",
  },
  {
    id: "ch4",
    title: "Book Before Bed",
    description: "Replace the last 30 minutes of screen time before bed with reading — any book, any genre, physical or e-ink reader only. Do this for 5 nights.",
    duration: "5 days",
    iconName: "book-open",
    color: "#7B5EA7",
    category: "Wellness",
    isPremium: false,
    steps: [
      "Pick a book each family member is excited to read",
      "Keep the book on your pillow so it is the first thing you see",
      "Read for the last 30 minutes before bed instead of screens",
      "Repeat for 5 nights",
      "Check in each night confirming you read instead of watched screens",
    ],
    tips: [
      "Keep the book on your pillow so it is the first thing you see when lying down",
      "It does not have to be educational — comic books, graphic novels, and fiction all count",
      "E-ink Kindles are allowed (no backlit tablets)",
      "If you fall asleep reading, that is a win",
      "Let kids pick books about whatever they are into — even if it seems silly",
    ],
    successCriteria: "Each participant checks in each night confirming they read instead of watched screens.",
  },
  {
    id: "ch5",
    title: "Tech-Free Morning",
    description: "No screens for the first 60 minutes after waking up — for the entire family — every day for 5 days. Start your morning with your own thoughts.",
    duration: "5 days",
    iconName: "sunrise",
    color: "#E67E22",
    category: "Wellness",
    isPremium: false,
    steps: [
      "Charge phones in the kitchen overnight",
      "Build a simple screen-free morning routine: stretch, make tea, sit quietly",
      "Keep screens off for the first 60 minutes after waking",
      "Notice your mood and energy compared to regular mornings",
      "Confirm each morning that the family stayed screen-free",
    ],
    tips: [
      "Charge your phone in the kitchen overnight so it is not the first thing you reach for",
      "Replace phone-checking with a simple morning routine: stretch, make tea, sit quietly",
      "The news will still be there in an hour",
      "Notice your mood and energy on tech-free mornings vs. regular mornings",
      "This is hardest on day 1 and 2 — it gets easier",
    ],
    successCriteria: "Family confirms no screens for first 60 minutes each morning.",
  },
  {
    id: "ch6",
    title: "Family Game Night",
    description: "Host a dedicated family game night — board games, card games, or outdoor games only. No screens involved. Do this twice this week.",
    duration: "7 days",
    iconName: "play-circle",
    color: "#8E44AD",
    category: "Social",
    isPremium: false,
    steps: [
      "Let each family member pick one game per session",
      "Set up snacks to make it feel like an event",
      "Host your first screen-free game night",
      "Host a second game night later in the week",
      "Keep it friendly — connection over winning",
    ],
    tips: [
      "Let each family member pick one game per session so everyone is invested",
      "Snacks make everything better — make it feel like an event",
      "Keep it friendly — the goal is connection, not winning",
      "Classics that work well: Uno, Catan, Ticket to Ride, Codenames, Bananagrams",
      "Younger children: Sequence for Kids, Sleeping Queens, Outfoxed",
    ],
    successCriteria: "Family completes two game nights with no screens during play time.",
  },
  {
    id: "ch7",
    title: "Digital Kindness Week",
    description: "Every day this week, each family member performs one intentional act of digital kindness — a genuine compliment, a check-in message to a friend, or sharing something helpful. Log each one.",
    duration: "7 days",
    iconName: "heart",
    color: "#E91E8C",
    category: "Social",
    isPremium: false,
    steps: [
      "Each family member performs one act of digital kindness daily",
      "Leave a sincere comment on someone's post",
      "Message a friend you haven't spoken to in a while",
      "Share something useful with no agenda",
      "Log each act of kindness throughout the week",
    ],
    tips: [
      "A sincere comment on someone's post counts more than a like",
      "Message a friend you haven't spoken to in a while",
      "Share a useful article with no agenda",
      "Write a genuine review for a small business you like",
      "Send a voice note instead of a text to someone — it feels more personal",
    ],
    successCriteria: "Each participant logs their daily act of digital kindness.",
  },
  {
    id: "ch8",
    title: "Password Security Audit",
    description: "Spend one family session reviewing and strengthening your digital security: update weak passwords, enable two-factor authentication on key accounts, and check for any accounts you no longer use.",
    duration: "1 day",
    iconName: "shield",
    color: "#4A90A4",
    category: "Privacy",
    isPremium: true,
    steps: [
      "Set up a password manager and stop reusing passwords",
      "Update weak passwords on priority accounts",
      "Enable two-factor authentication on email, banking, and social media",
      "Check haveibeenpwned.com for breached accounts",
      "Delete accounts you no longer use",
    ],
    tips: [
      "Use a password manager like 1Password or Bitwarden — do not reuse passwords",
      "Priority accounts for 2FA: email, banking, Apple/Google ID, social media",
      "Test if your email has been in a data breach: haveibeenpwned.com",
      "Delete accounts you no longer use — they are security liabilities",
      "Make it a family event — do it together over pizza",
    ],
    successCriteria: "Parent confirms family completed the security audit together.",
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

export const SCREEN_TIME_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "st1",
    question: "Does your family have device-free times during the day (like meals or bedtime)?",
    options: [
      { label: "Yes, and we stick to them consistently", score: 3 },
      { label: "Yes, but we're not always consistent", score: 2 },
      { label: "We've talked about it but haven't set any", score: 1 },
      { label: "No, screens are allowed anytime", score: 0 },
    ],
    category: "Wellness",
  },
  {
    id: "st2",
    question: "Are screens kept out of bedrooms overnight?",
    options: [
      { label: "Yes, devices charge outside bedrooms every night", score: 3 },
      { label: "Usually, with occasional exceptions", score: 2 },
      { label: "Rarely — devices often stay in bedrooms", score: 1 },
      { label: "No, devices are always in bedrooms", score: 0 },
    ],
    category: "Wellness",
  },
  {
    id: "st3",
    question: "Does your child take regular breaks from screens for physical activity?",
    options: [
      { label: "Yes, active breaks are part of every day", score: 3 },
      { label: "Most days they get active time", score: 2 },
      { label: "Only occasionally", score: 1 },
      { label: "Rarely or never", score: 0 },
    ],
    category: "Wellness",
  },
  {
    id: "st4",
    question: "Do you use built-in screen time tools or app timers to manage device use?",
    options: [
      { label: "Yes, they're set up and we review them together", score: 3 },
      { label: "Yes, but I don't check them often", score: 2 },
      { label: "I've looked into them but not set them up", score: 1 },
      { label: "No, I don't use any tools", score: 0 },
    ],
    category: "Safety",
  },
  {
    id: "st5",
    question: "Do you talk with your child about how screen time makes them feel?",
    options: [
      { label: "Yes, we check in about this regularly", score: 3 },
      { label: "Sometimes, when something comes up", score: 2 },
      { label: "Rarely", score: 1 },
      { label: "No, we haven't discussed feelings around screens", score: 0 },
    ],
    category: "Communication",
  },
  {
    id: "st6",
    question: "Is there a screen-free wind-down routine before bed?",
    options: [
      { label: "Yes, screens are off well before bedtime", score: 3 },
      { label: "Usually, but it varies", score: 2 },
      { label: "Occasionally", score: 1 },
      { label: "No, screens are often used right up to sleep", score: 0 },
    ],
    category: "Wellness",
  },
  {
    id: "st7",
    question: "Are weekends balanced between screen time and offline activities?",
    options: [
      { label: "Yes, we keep a healthy balance", score: 3 },
      { label: "Mostly balanced", score: 2 },
      { label: "Weekends skew heavily toward screens", score: 1 },
      { label: "No, weekends are mostly screen time", score: 0 },
    ],
    category: "Wellness",
  },
  {
    id: "st8",
    question: "Have you and your child agreed on screen time limits together?",
    options: [
      { label: "Yes, we set the limits as a family", score: 3 },
      { label: "I set them and explained why", score: 2 },
      { label: "There are limits but they weren't discussed", score: 1 },
      { label: "No, there are no agreed limits", score: 0 },
    ],
    category: "Communication",
  },
  {
    id: "st9",
    question: "Do you talk as a family about the content and apps everyone spends time on?",
    options: [
      { label: "Yes, we regularly share what we watch and play", score: 3 },
      { label: "Sometimes", score: 2 },
      { label: "Rarely", score: 1 },
      { label: "No, we don't discuss it", score: 0 },
    ],
    category: "Communication",
  },
  {
    id: "st10",
    question: "Does your child have offline hobbies they enjoy regularly?",
    options: [
      { label: "Yes, several they're passionate about", score: 3 },
      { label: "Yes, at least one regular hobby", score: 2 },
      { label: "Not really, but they're open to it", score: 1 },
      { label: "No, free time is mostly screens", score: 0 },
    ],
    category: "Wellness",
  },
];

export const CYBERBULLYING_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "cb1",
    question: "Does your child know what cyberbullying looks like?",
    options: [
      { label: "Yes, we've discussed examples clearly", score: 3 },
      { label: "They have a general idea", score: 2 },
      { label: "We've mentioned it briefly", score: 1 },
      { label: "No, we haven't covered this", score: 0 },
    ],
    category: "Safety",
  },
  {
    id: "cb2",
    question: "Would your child tell you if they were being bullied online?",
    options: [
      { label: "Yes, I'm confident they would", score: 3 },
      { label: "I think so, but I'm not certain", score: 2 },
      { label: "Probably not — they'd handle it alone", score: 1 },
      { label: "No, they likely wouldn't tell me", score: 0 },
    ],
    category: "Communication",
  },
  {
    id: "cb3",
    question: "Does your child know how to block and report a bully on their platforms?",
    options: [
      { label: "Yes, they know how on all their apps", score: 3 },
      { label: "Yes, on some apps", score: 2 },
      { label: "We've talked about it but not practiced", score: 1 },
      { label: "No, they don't know how", score: 0 },
    ],
    category: "Safety",
  },
  {
    id: "cb4",
    question: "Does your child understand they shouldn't retaliate against an online bully?",
    options: [
      { label: "Yes, we've discussed why retaliating makes it worse", score: 3 },
      { label: "They generally understand", score: 2 },
      { label: "We haven't really covered this", score: 1 },
      { label: "No, they might fight back online", score: 0 },
    ],
    category: "Safety",
  },
  {
    id: "cb5",
    question: "Does your child know to save evidence (like screenshots) of bullying?",
    options: [
      { label: "Yes, they know how and why to keep records", score: 3 },
      { label: "They have a rough idea", score: 2 },
      { label: "We haven't discussed this", score: 1 },
      { label: "No, they'd likely just delete it", score: 0 },
    ],
    category: "Digital Footprint",
  },
  {
    id: "cb6",
    question: "Have you discussed what to do if they witness someone else being bullied?",
    options: [
      { label: "Yes, they know how to support and report it", score: 3 },
      { label: "We've touched on it", score: 2 },
      { label: "Not really", score: 1 },
      { label: "No, we haven't discussed bystander situations", score: 0 },
    ],
    category: "Communication",
  },
  {
    id: "cb7",
    question: "Does your child understand that being bullied is never their fault?",
    options: [
      { label: "Yes, we've reinforced this clearly", score: 3 },
      { label: "I believe they understand", score: 2 },
      { label: "We haven't emphasized it", score: 1 },
      { label: "No, they might blame themselves", score: 0 },
    ],
    category: "Wellness",
  },
  {
    id: "cb8",
    question: "Have you talked about being kind online and not bullying others?",
    options: [
      { label: "Yes, kindness online is an ongoing conversation", score: 3 },
      { label: "We've discussed it a few times", score: 2 },
      { label: "Only briefly", score: 1 },
      { label: "No, we haven't discussed their own behavior", score: 0 },
    ],
    category: "Safety",
  },
  {
    id: "cb9",
    question: "Do you regularly check in about your child's online social experiences?",
    options: [
      { label: "Yes, we talk about it often", score: 3 },
      { label: "Sometimes", score: 2 },
      { label: "Rarely", score: 1 },
      { label: "No, I don't ask about their online life", score: 0 },
    ],
    category: "Communication",
  },
  {
    id: "cb10",
    question: "Does your child know which trusted adults they can turn to beyond you?",
    options: [
      { label: "Yes, they can name several trusted adults", score: 3 },
      { label: "Yes, at least one besides me", score: 2 },
      { label: "They're unsure", score: 1 },
      { label: "No, they don't know who else to turn to", score: 0 },
    ],
    category: "Safety",
  },
];

export interface Assessment {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  iconName: string;
  color: string;
  duration: string;
  questions: AssessmentQuestion[];
}

export const ASSESSMENTS: Assessment[] = [
  {
    id: "social-media",
    title: "Social Media Readiness",
    shortTitle: "Social Media",
    description: "Gauge how ready your family is for social media — privacy, safety, and healthy habits.",
    iconName: "share-2",
    color: "#7B5EA7",
    duration: "~5 min",
    questions: ASSESSMENT_QUESTIONS,
  },
  {
    id: "screen-time",
    title: "Screen Time Habits",
    shortTitle: "Screen Time",
    description: "See how balanced your family's screen time is and where small routines could help.",
    iconName: "clock",
    color: "#4A90A4",
    duration: "~5 min",
    questions: SCREEN_TIME_QUESTIONS,
  },
  {
    id: "cyberbullying",
    title: "Cyberbullying Awareness",
    shortTitle: "Cyberbullying",
    description: "Check whether your child can recognize, respond to, and recover from cyberbullying.",
    iconName: "shield",
    color: "#E07B39",
    duration: "~5 min",
    questions: CYBERBULLYING_QUESTIONS,
  },
];

export const BADGES: Badge[] = [
  { id: "b1", title: "First Steps", description: "Completed your first lesson in Digital Village.", iconName: "award", color: "#F5A623", condition: "complete_first_lesson" },
  { id: "b2", title: "Knowledge Seeker", description: "Completed 5 lessons.", iconName: "book", color: "#4A90A4", condition: "complete_5_lessons" },
  { id: "b3", title: "Digital Scholar", description: "Completed all 8 core lessons.", iconName: "book-open", color: "#7B5EA7", condition: "complete_8_lessons" },
  { id: "b4", title: "Quiz Ace", description: "Scored 100% on any quiz.", iconName: "star", color: "#E07B39", condition: "quiz_perfect_score" },
  { id: "b5", title: "Sharp Mind", description: "Scored 100% on 3 quizzes.", iconName: "zap", color: "#F39C12", condition: "quiz_perfect_score_3" },
  { id: "b6", title: "Cyber Safety Expert", description: "Completed lessons on all 8 safety topics.", iconName: "shield", color: "#3A7D6B", condition: "all_categories_complete" },
  { id: "b7", title: "First Challenge", description: "Completed your first family challenge.", iconName: "flag", color: "#2D7DD2", condition: "complete_first_challenge" },
  { id: "b8", title: "Challenge Champion", description: "Completed 5 family challenges.", iconName: "award", color: "#C0392B", condition: "complete_5_challenges" },
  { id: "b9", title: "Unplugged Hero", description: "Completed Screen-Free Saturday.", iconName: "wifi-off", color: "#F39C12", condition: "complete_challenge_ch1" },
  { id: "b10", title: "Family Table", description: "Completed the full Dinner Without Devices challenge.", iconName: "coffee", color: "#27AE60", condition: "complete_challenge_ch2" },
  { id: "b11", title: "Nature Navigator", description: "Completed the 7-Day Outdoor Challenge.", iconName: "map", color: "#3A7D6B", condition: "complete_challenge_ch3" },
  { id: "b12", title: "Bookworm", description: "Completed Book Before Bed.", iconName: "book-open", color: "#7B5EA7", condition: "complete_challenge_ch4" },
  { id: "b13", title: "Morning Mindful", description: "Completed Tech-Free Morning.", iconName: "sunrise", color: "#E67E22", condition: "complete_challenge_ch5" },
  { id: "b14", title: "Digital Village Family", description: "Created your family profile and added at least one child.", iconName: "users", color: "#4A90A4", condition: "family_setup_complete" },
  { id: "b15", title: "Agreement Makers", description: "Created and signed a Family Technology Agreement.", iconName: "file-text", color: "#2D7DD2", condition: "agreement_signed" },
  { id: "b16", title: "All Hands In", description: "All family members participated in the same challenge.", iconName: "thumbs-up", color: "#E91E8C", condition: "all_members_same_challenge" },
  { id: "b17", title: "Safety Assessed", description: "Completed the Social Media Readiness Assessment.", iconName: "clipboard", color: "#27AE60", condition: "assessment_complete" },
  { id: "b18", title: "One Month Strong", description: "Active in Digital Village for 30 days.", iconName: "calendar", color: "#F5A623", condition: "days_active_30" },
  { id: "b19", title: "Three Month Journey", description: "Active in Digital Village for 90 days.", iconName: "trending-up", color: "#8E44AD", condition: "days_active_90" },
  { id: "b20", title: "Dedicated Parent", description: "Completed 8 weekly coaching tip readings.", iconName: "heart", color: "#E91E8C", condition: "coaching_tips_read_8" },
  { id: "b21", title: "Safety Advocate", description: "Completed 10 lessons and 3 challenges.", iconName: "shield", color: "#C0392B", condition: "lessons_10_challenges_3" },
  { id: "b22", title: "Password Guardian", description: "Completed the Password Security Audit challenge.", iconName: "lock", color: "#2D7DD2", condition: "complete_challenge_ch8" },
];

export const WEEKLY_TIPS: WeeklyTip[] = [
  {
    id: "wt1",
    title: "Start With Curiosity, Not Control",
    content: `This week's tip: Before setting rules about technology, spend one week in observation mode. Ask curious questions rather than issuing directives.\n\nTry asking:\n• "What's your favorite thing about that game?"\n• "Show me what you're doing on there — I want to understand it."\n• "What would feel fair to you for screen time?"\n\nWhy this works: Children who feel their parents understand their digital world are 3x more likely to come to them when something goes wrong online. You cannot protect what you do not understand. This week, your only job is to understand.\n\nAction: Have one 15-minute conversation this week where you genuinely ask your child to show you something they do online — with zero judgment.`,
    category: "Connection",
    iconName: "message-circle",
  },
  {
    id: "wt2",
    title: "The Family Technology Agreement",
    content: `This week's tip: Families that create rules together follow rules together. Research on adolescent compliance shows that teens who participate in creating household rules are 40% more likely to follow them compared to rules imposed on them.\n\nA Family Technology Agreement does not have to be long or formal. It just needs to:\n• Cover the basics: device-free times, screen time limits, content boundaries, what to do if something uncomfortable happens online\n• Be created WITH your children, not FOR them\n• Be signed by everyone — including parents\n• Be revisited every 6 months as needs change\n\nThis app's Agreement Builder walks you through it step by step. Even the act of building it together starts the right conversations.\n\nAction: Open the Agreement Builder this week and build your first draft. Let your child add at least one rule they care about.`,
    category: "Family Rules",
    iconName: "file-text",
  },
  {
    id: "wt3",
    title: "Talk About the Tech You Use — Not Just Theirs",
    content: `This week's tip: Parenting researchers call this 'modeling digital wellbeing.' Your children learn far more from what you DO with technology than from what you SAY about it.\n\nHonest questions to ask yourself:\n• Do I check my phone during meals?\n• Do I scroll social media before bed?\n• Have I ever said "just a minute" to my child because of my phone and had "a minute" turn into 20?\n\nThis is not about shame — it is about awareness. One powerful move: narrate your own digital choices out loud. "I'm going to put my phone down while we talk." "I noticed I've been scrolling for a while — I'm going to go do something else." This kind of self-talk out loud is one of the most effective ways to teach self-regulation.\n\nAction: This week, put your phone face-down or in another room during at least one meal every day.`,
    category: "Modeling",
    iconName: "eye",
  },
  {
    id: "wt4",
    title: "Privacy Conversations That Actually Land",
    content: `This week's tip: "Be careful online" is too vague to be useful. Children need specific, concrete guidance.\n\nInstead of vague warnings, use specific scenarios:\n• "What would you do if someone you only know online asked for your school name?"\n• "If a friend posted a photo of you that you hated, what would you do?"\n• "What information could someone figure out about you from your Instagram profile right now?"\n\nScenario-based conversations are dramatically more effective than rule-recitation because they build judgment, not just compliance. Judgment works when you are not there. Rules often don't.\n\nPractical action: This week, do a privacy settings review together on one social media account your child uses. Go through every setting together. Ask "why do you think they offer this option?" to build critical thinking.\n\nBonus: Google your child's full name together. Discuss what you find.`,
    category: "Privacy",
    iconName: "lock",
  },
  {
    id: "wt5",
    title: "Responding When Something Goes Wrong",
    content: `This week's tip: How you respond the FIRST TIME your child comes to you with a digital problem determines whether they come to you the SECOND time.\n\nThe most common parental responses that close the door:\n• Taking the device away as a consequence\n• Saying "I told you so"\n• Contacting the other family or the school before consulting your child\n• Asking "why were you even on that?" before asking "are you okay?"\n\nThe response that keeps the door open:\n1. Ask "are you okay?" first — always.\n2. Listen fully before problem-solving.\n3. Ask "what kind of support do you want from me right now?" — sometimes they want advice, sometimes they want to vent, sometimes they want you to handle it.\n4. Handle it together, not for them.\n\nAction: Have a direct conversation this week: "If something ever makes you uncomfortable online, I want you to know I will not punish you for telling me. I will only help you." Say those specific words. Write them in the agreement.`,
    category: "Crisis Response",
    iconName: "life-buoy",
  },
  {
    id: "wt6",
    title: "Understanding the Platforms They Use",
    content: `This week's tip: You cannot guide your child through a landscape you have never visited. This week, spend 30 minutes exploring the platform your child uses most — not to monitor, but to understand.\n\nWhat to look for:\n• Default privacy settings (most platforms default to PUBLIC)\n• Who can message your child (anyone? friends of friends?)\n• How easy is it to find their location?\n• What content is easily accessible?\n• What does the comment section on popular posts look like?\n\nPlatform-specific things to know:\n\nTikTok: Default for under-16 is private, but it is easily changed. DMs are restricted for under-16 by default — verify this.\n\nInstagram: Default is public. Go to Settings → Privacy → Account Privacy → set to Private.\n\nSnapchat: 'Quick Add' can suggest your child to strangers. Turn off: Settings → Privacy Controls → See Me in Quick Add.\n\nRoblox: Chat can be restricted to friends only. Settings → Privacy → set Contact Settings to 'Friends Only.'\n\nAction: Spend 30 minutes on your child's primary platform this week. Then have a conversation about what you found — without alarm.`,
    category: "Platform Knowledge",
    iconName: "smartphone",
  },
  {
    id: "wt7",
    title: "Screen Time That Builds vs. Drains",
    content: `This week's tip: Not all screen time is created equal. Helping your child identify HOW they feel after different types of screen use is more powerful than time limits alone.\n\nBuilding screen time (generally positive):\n• Creating: video editing, coding, digital art, writing\n• Connecting: video calls with known friends and family\n• Learning: documentaries, educational content, skill development\n• Active gaming: games that require problem-solving or coordination\n\nDraining screen time (monitor closely):\n• Passive scrolling: infinite scroll feeds designed to maximize time-on-platform\n• Comparison-heavy content: highlight reels on Instagram and TikTok\n• Rage-inducing content: comment sections, controversial videos\n• Late-night use: any screen within 60 minutes of sleep\n\nThe check-in question: After your child has had screen time, simply ask: "Do you feel good, neutral, or worse than before you started?" Build their awareness over time — it becomes self-regulating.\n\nAction: This week, try the check-in question after screen time with genuine curiosity, not judgment.`,
    category: "Screen Health",
    iconName: "activity",
  },
  {
    id: "wt8",
    title: "Building Long-Term Digital Resilience",
    content: `This week's tip: The goal of digital parenting is not to protect your child from the internet forever. It is to raise someone who can navigate it wisely when you are not there.\n\nDigital resilience looks like:\n• Knowing how to verify information before sharing it\n• Recognizing when an app or interaction is making them feel worse\n• Having the confidence to end or report an uncomfortable conversation\n• Understanding that their digital footprint is their responsibility\n• Knowing they can always come to a trusted adult\n\nHow you build it:\n• Give age-appropriate independence gradually — supervised, then semi-supervised, then independent\n• Debrief after difficult digital situations rather than just punishing them\n• Celebrate good digital judgment out loud: "I noticed you didn't engage with that negative comment — that was smart."\n• Talk about your own digital mistakes and what you learned\n\nYou have been building this with every conversation you have had, every lesson you have read, and every challenge you have taken on as a family. Digital safety is not a destination — it is an ongoing practice.\n\nAction: Share one thing you have learned or changed because of Digital Village with your child this week. Let them know you are learning too.`,
    category: "Resilience",
    iconName: "trending-up",
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
