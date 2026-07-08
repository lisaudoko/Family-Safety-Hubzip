/**
 * One-time idempotent weekly-tips seed script.
 *
 * Migrates the legacy hard-coded WEEKLY_TIPS from artifacts/mobile/data/seed.ts into
 * the weekly_tips table, preserving exact legacy ids (wt1-wt8) and order.
 *
 * Run with: pnpm --filter @workspace/db seed:tips
 */
import { db, pool, weeklyTipsTable } from "@workspace/db";

interface TipRow {
  id: string;
  title: string;
  content: string;
  category: string;
  icon_name: string;
  sort_order: number;
}

const tips: TipRow[] = [
  {
    id: "wt1",
    title: "Start With Curiosity, Not Control",
    content: `This week's tip: Before setting rules about technology, spend one week in observation mode. Ask curious questions rather than issuing directives.\n\nTry asking:\n• "What's your favorite thing about that game?"\n• "Show me what you're doing on there — I want to understand it."\n• "What would feel fair to you for screen time?"\n\nWhy this works: Children who feel their parents understand their digital world are 3x more likely to come to them when something goes wrong online. You cannot protect what you do not understand. This week, your only job is to understand.\n\nAction: Have one 15-minute conversation this week where you genuinely ask your child to show you something they do online — with zero judgment.`,
    category: "Connection",
    icon_name: "message-circle",
    sort_order: 0,
  },
  {
    id: "wt2",
    title: "The Family Technology Agreement",
    content: `This week's tip: Families that create rules together follow rules together. Research on adolescent compliance shows that teens who participate in creating household rules are 40% more likely to follow them compared to rules imposed on them.\n\nA Family Technology Agreement does not have to be long or formal. It just needs to:\n• Cover the basics: device-free times, screen time limits, content boundaries, what to do if something uncomfortable happens online\n• Be created WITH your children, not FOR them\n• Be signed by everyone — including parents\n• Be revisited every 6 months as needs change\n\nThis app's Agreement Builder walks you through it step by step. Even the act of building it together starts the right conversations.\n\nAction: Open the Agreement Builder this week and build your first draft. Let your child add at least one rule they care about.`,
    category: "Family Rules",
    icon_name: "file-text",
    sort_order: 1,
  },
  {
    id: "wt3",
    title: "Talk About the Tech You Use — Not Just Theirs",
    content: `This week's tip: Parenting researchers call this 'modeling digital wellbeing.' Your children learn far more from what you DO with technology than from what you SAY about it.\n\nHonest questions to ask yourself:\n• Do I check my phone during meals?\n• Do I scroll social media before bed?\n• Have I ever said "just a minute" to my child because of my phone and had "a minute" turn into 20?\n\nThis is not about shame — it is about awareness. One powerful move: narrate your own digital choices out loud. "I'm going to put my phone down while we talk." "I noticed I've been scrolling for a while — I'm going to go do something else." This kind of self-talk out loud is one of the most effective ways to teach self-regulation.\n\nAction: This week, put your phone face-down or in another room during at least one meal every day.`,
    category: "Modeling",
    icon_name: "eye",
    sort_order: 2,
  },
  {
    id: "wt4",
    title: "Privacy Conversations That Actually Land",
    content: `This week's tip: "Be careful online" is too vague to be useful. Children need specific, concrete guidance.\n\nInstead of vague warnings, use specific scenarios:\n• "What would you do if someone you only know online asked for your school name?"\n• "If a friend posted a photo of you that you hated, what would you do?"\n• "What information could someone figure out about you from your Instagram profile right now?"\n\nScenario-based conversations are dramatically more effective than rule-recitation because they build judgment, not just compliance. Judgment works when you are not there. Rules often don't.\n\nPractical action: This week, do a privacy settings review together on one social media account your child uses. Go through every setting together. Ask "why do you think they offer this option?" to build critical thinking.\n\nBonus: Google your child's full name together. Discuss what you find.`,
    category: "Privacy",
    icon_name: "lock",
    sort_order: 3,
  },
  {
    id: "wt5",
    title: "Responding When Something Goes Wrong",
    content: `This week's tip: How you respond the FIRST TIME your child comes to you with a digital problem determines whether they come to you the SECOND time.\n\nThe most common parental responses that close the door:\n• Taking the device away as a consequence\n• Saying "I told you so"\n• Contacting the other family or the school before consulting your child\n• Asking "why were you even on that?" before asking "are you okay?"\n\nThe response that keeps the door open:\n1. Ask "are you okay?" first — always.\n2. Listen fully before problem-solving.\n3. Ask "what kind of support do you want from me right now?" — sometimes they want advice, sometimes they want to vent, sometimes they want you to handle it.\n4. Handle it together, not for them.\n\nAction: Have a direct conversation this week: "If something ever makes you uncomfortable online, I want you to know I will not punish you for telling me. I will only help you." Say those specific words. Write them in the agreement.`,
    category: "Crisis Response",
    icon_name: "life-buoy",
    sort_order: 4,
  },
  {
    id: "wt6",
    title: "Understanding the Platforms They Use",
    content: `This week's tip: You cannot guide your child through a landscape you have never visited. This week, spend 30 minutes exploring the platform your child uses most — not to monitor, but to understand.\n\nWhat to look for:\n• Default privacy settings (most platforms default to PUBLIC)\n• Who can message your child (anyone? friends of friends?)\n• How easy is it to find their location?\n• What content is easily accessible?\n• What does the comment section on popular posts look like?\n\nPlatform-specific things to know:\n\nTikTok: Default for under-16 is private, but it is easily changed. DMs are restricted for under-16 by default — verify this.\n\nInstagram: Default is public. Go to Settings → Privacy → Account Privacy → set to Private.\n\nSnapchat: 'Quick Add' can suggest your child to strangers. Turn off: Settings → Privacy Controls → See Me in Quick Add.\n\nRoblox: Chat can be restricted to friends only. Settings → Privacy → set Contact Settings to 'Friends Only.'\n\nAction: Spend 30 minutes on your child's primary platform this week. Then have a conversation about what you found — without alarm.`,
    category: "Platform Knowledge",
    icon_name: "smartphone",
    sort_order: 5,
  },
  {
    id: "wt7",
    title: "Screen Time That Builds vs. Drains",
    content: `This week's tip: Not all screen time is created equal. Helping your child identify HOW they feel after different types of screen use is more powerful than time limits alone.\n\nBuilding screen time (generally positive):\n• Creating: video editing, coding, digital art, writing\n• Connecting: video calls with known friends and family\n• Learning: documentaries, educational content, skill development\n• Active gaming: games that require problem-solving or coordination\n\nDraining screen time (monitor closely):\n• Passive scrolling: infinite scroll feeds designed to maximize time-on-platform\n• Comparison-heavy content: highlight reels on Instagram and TikTok\n• Rage-inducing content: comment sections, controversial videos\n• Late-night use: any screen within 60 minutes of sleep\n\nThe check-in question: After your child has had screen time, simply ask: "Do you feel good, neutral, or worse than before you started?" Build their awareness over time — it becomes self-regulating.\n\nAction: This week, try the check-in question after screen time with genuine curiosity, not judgment.`,
    category: "Screen Health",
    icon_name: "activity",
    sort_order: 6,
  },
  {
    id: "wt8",
    title: "Building Long-Term Digital Resilience",
    content: `This week's tip: The goal of digital parenting is not to protect your child from the internet forever. It is to raise someone who can navigate it wisely when you are not there.\n\nDigital resilience looks like:\n• Knowing how to verify information before sharing it\n• Recognizing when an app or interaction is making them feel worse\n• Having the confidence to end or report an uncomfortable conversation\n• Understanding that their digital footprint is their responsibility\n• Knowing they can always come to a trusted adult\n\nHow you build it:\n• Give age-appropriate independence gradually — supervised, then semi-supervised, then independent\n• Debrief after difficult digital situations rather than just punishing them\n• Celebrate good digital judgment out loud: "I noticed you didn't engage with that negative comment — that was smart."\n• Talk about your own digital mistakes and what you learned\n\nYou have been building this with every conversation you have had, every lesson you have read, and every challenge you have taken on as a family. Digital safety is not a destination — it is an ongoing practice.\n\nAction: Share one thing you have learned or changed because of Digital Village with your child this week. Let them know you are learning too.`,
    category: "Resilience",
    icon_name: "trending-up",
    sort_order: 7,
  },
];

async function main() {
  await db.insert(weeklyTipsTable).values(tips).onConflictDoNothing({ target: weeklyTipsTable.id });
  console.log(`Seeded ${tips.length} weekly tips.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
