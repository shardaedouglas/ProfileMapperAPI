import { Person, Profile, MatchResult, MatchFactors } from './types';

// ============ STRING SIMILARITY ============
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const trimA = a?.trim(), trimB = b?.trim();
  if (!trimA || !trimB) return 0;
  const maxLen = Math.max(trimA.length, trimB.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(trimA.toLowerCase(), trimB.toLowerCase()) / maxLen;
}

// ============ NICKNAME MAPPING ============
const NICKNAMES: Record<string, string[]> = {
  william: ['will', 'bill', 'billy'], robert: ['rob', 'bob', 'bobby'],
  richard: ['rick', 'dick', 'rich'], james: ['jim', 'jimmy', 'jamie'],
  michael: ['mike', 'mikey'], elizabeth: ['liz', 'beth', 'lizzy', 'betty'],
  jennifer: ['jen', 'jenny'], margaret: ['maggie', 'meg', 'peggy'],
  katherine: ['kate', 'kathy', 'katie'], jonathan: ['jon', 'john', 'johnny'],
  christopher: ['chris'], nicholas: ['nick'], alexander: ['alex'],
  benjamin: ['ben'], daniel: ['dan', 'danny'], matthew: ['matt'],
  anthony: ['tony'], joseph: ['joe', 'joey'], david: ['dave'],
};

function areNicknameVariants(n1: string, n2: string): boolean {
  const a = n1.toLowerCase(), b = n2.toLowerCase();
  if (a === b) return true;
  for (const [formal, nicks] of Object.entries(NICKNAMES)) {
    const all = new Set([formal, ...nicks]);
    if (all.has(a) && all.has(b)) return true;
  }
  return false;
}

// ============ LOCATION ALIASES ============
const LOCATION_ALIASES: Record<string, string[]> = {
  'san francisco': ['sf', 'bay area', 'sf bay area'],
  'new york': ['nyc', 'new york city', 'ny', 'manhattan'],
  'los angeles': ['la', 'socal'],
};

function normalizeLocation(loc: string): string {
  return loc.toLowerCase().replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchLocationAlias(loc1: string, loc2: string): boolean {
  const n1 = normalizeLocation(loc1), n2 = normalizeLocation(loc2);
  for (const [canonical, aliases] of Object.entries(LOCATION_ALIASES)) {
    const all = [canonical, ...aliases];
    if (all.some(a => n1.includes(a)) && all.some(a => n2.includes(a))) return true;
  }
  return false;
}

// ============ PHONE NORMALIZATION ============
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10); // Keep last 10 digits
}

// ============ DATE PARSING ============
function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function extractYearFromBio(bio: string): number | null {
  // Look for birth year patterns like "born 1990", "class of 2012", age patterns
  const bornMatch = bio.match(/born\s+(?:in\s+)?(\d{4})/i);
  if (bornMatch) return parseInt(bornMatch[1]);
  
  const ageMatch = bio.match(/(\d{1,2})\s*(?:years?\s*old|yo|y\/o)/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age > 10 && age < 100) return new Date().getFullYear() - age;
  }
  return null;
}

// ============ MATCHERS ============
export function matchName(personName?: string, profileName?: string): number {
  const name1 = personName?.trim(), name2 = profileName?.trim();
  if (!name1 || !name2) return 0;
  const p1 = name1.toLowerCase().split(/\s+/).filter(Boolean);
  const p2 = name2.toLowerCase().split(/\s+/).filter(Boolean);
  if (p1.length === 0 || p2.length === 0) return 0;
  if (p1.join(' ') === p2.join(' ')) return 1;
  
  // Check nickname on first name + last name match
  if (p1.length > 0 && p2.length > 0 && areNicknameVariants(p1[0], p2[0])) {
    if (p1.length > 1 && p2.length > 1) {
      const lastSim = similarity(p1[p1.length - 1], p2[p2.length - 1]);
      if (lastSim > 0.8) return 0.95;
    }
    return 0.7;
  }
  
  // Initial match (J. Doe vs Jane Doe)
  if (p2[0].length === 1 && p1[0].startsWith(p2[0])) {
    if (p1.length > 1 && p2.length > 1) {
      return 0.5 + similarity(p1[p1.length - 1], p2[p2.length - 1]) * 0.3;
    }
    return 0.4;
  }
  
  return similarity(name1, name2);
}

export function matchLocation(personLoc?: string, profileLoc?: string): number {
  if (!personLoc || !profileLoc) return 0;
  const n1 = normalizeLocation(personLoc), n2 = normalizeLocation(profileLoc);
  if (n1 === n2) return 1;
  if (matchLocationAlias(personLoc, profileLoc)) return 0.9;
  if (n1.includes(n2) || n2.includes(n1)) return 0.85;
  return similarity(n1, n2);
}

export function matchEmployerInBio(employer?: string, bio?: string): number {
  if (!employer || !bio) return 0;
  const e = employer.toLowerCase(), b = bio.toLowerCase();
  if (b.includes(e)) return 1;
  const words = e.split(/\s+/).filter(w => w.length > 2);
  const matched = words.filter(w => b.includes(w));
  return matched.length > 0 ? 0.5 * (matched.length / words.length) : 0;
}

export function matchJobTitleInBio(jobTitle?: string, bio?: string): number {
  if (!jobTitle || !bio) return 0;
  const t = jobTitle.toLowerCase(), b = bio.toLowerCase();
  if (b.includes(t)) return 1;
  
  // Check individual words (e.g., "Engineer" in "Software Engineer")
  const words = t.split(/\s+/).filter(w => w.length > 3);
  const matched = words.filter(w => b.includes(w));
  if (matched.length > 0) return 0.6 * (matched.length / words.length);
  
  return similarity(t, b) > 0.5 ? similarity(t, b) * 0.5 : 0;
}

export function matchEmailToUsername(emails?: string | string[], username?: string): number {
  if (!emails || !username) return 0;
  const list = Array.isArray(emails) ? emails : [emails];
  const uNorm = username.toLowerCase().replace(/[._-]/g, '').replace(/\d+/g, '');
  
  for (const email of list) {
    const eUser = email.split('@')[0].toLowerCase();
    const eNorm = eUser.replace(/[._-]/g, '').replace(/\d+/g, '');
    if (eUser === username.toLowerCase()) return 1;
    if (eNorm === uNorm) return 0.9;
    if (uNorm.includes(eNorm) || eNorm.includes(uNorm)) return 0.7;
  }
  return 0;
}

export function matchPhoneInBio(phones?: string | string[], bio?: string): number {
  if (!phones || !bio) return 0;
  const list = Array.isArray(phones) ? phones : [phones];
  const bioDigits = bio.replace(/\D/g, '');
  
  for (const phone of list) {
    const normalized = normalizePhone(phone);
    if (normalized.length >= 7 && bioDigits.includes(normalized)) return 1;
    // Check last 7 digits (local number without area code)
    if (normalized.length >= 7 && bioDigits.includes(normalized.slice(-7))) return 0.8;
  }
  return 0;
}

export function matchDateOfBirth(dob?: string, bio?: string): number {
  if (!dob || !bio) return 0;
  const personDate = parseDate(dob);
  if (!personDate) return 0;
  
  const personYear = personDate.getFullYear();
  const bioYear = extractYearFromBio(bio);
  
  if (bioYear) {
    if (bioYear === personYear) return 1;
    if (Math.abs(bioYear - personYear) <= 1) return 0.7; // Off by 1 year (age calculation)
  }
  return 0;
}

// ============ WEIGHTS & SCORING ============
const WEIGHTS = {
  name: 0.30,
  location: 0.12,
  employer: 0.18,
  emailUsername: 0.18,
  jobTitle: 0.10,
  phone: 0.07,
  dateOfBirth: 0.05,
};

export function calculateMatchScore(person: Person, profile: Profile): MatchResult {
  const factors: MatchFactors = {};
  let score = 0, weight = 0;
  
  // Get display name (support both camelCase and snake_case)
  const displayName = profile.displayName || (profile as Record<string, unknown>).display_name as string | undefined;

  if (person.name && displayName) {
    const s = matchName(person.name, displayName);
    factors.name_match = s;
    score += s * WEIGHTS.name; weight += WEIGHTS.name;
  }
  if (person.location && profile.location) {
    const s = matchLocation(person.location, profile.location);
    factors.location_match = s;
    score += s * WEIGHTS.location; weight += WEIGHTS.location;
  }
  if (person.employer && profile.bio) {
    const s = matchEmployerInBio(person.employer, profile.bio);
    factors.employer_in_bio = s;
    score += s * WEIGHTS.employer; weight += WEIGHTS.employer;
  }
  if (person.jobTitle && profile.bio) {
    const s = matchJobTitleInBio(person.jobTitle, profile.bio);
    factors.job_title_in_bio = s;
    score += s * WEIGHTS.jobTitle; weight += WEIGHTS.jobTitle;
  }
  if (person.email && profile.username) {
    const s = matchEmailToUsername(person.email, profile.username);
    factors.email_username_match = s;
    score += s * WEIGHTS.emailUsername; weight += WEIGHTS.emailUsername;
  }
  if (person.phone && profile.bio) {
    const s = matchPhoneInBio(person.phone, profile.bio);
    factors.phone_in_bio = s;
    score += s * WEIGHTS.phone; weight += WEIGHTS.phone;
  }
  if (person.dateOfBirth && profile.bio) {
    const s = matchDateOfBirth(person.dateOfBirth, profile.bio);
    factors.dob_match = s;
    score += s * WEIGHTS.dateOfBirth; weight += WEIGHTS.dateOfBirth;
  }

  const finalScore = weight > 0 ? Math.round((score / weight) * 100) / 100 : 0;
  return { profile, score: finalScore, factors };
}

export function matchProfiles(person: Person, profiles: Profile[]): MatchResult[] {
  return profiles.map(p => calculateMatchScore(person, p)).sort((a, b) => b.score - a.score);
}
