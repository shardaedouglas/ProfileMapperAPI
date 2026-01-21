import { describe, it, expect } from 'vitest';
import { 
  matchName, matchLocation, matchEmployerInBio, matchEmailToUsername, 
  matchJobTitleInBio, matchPhoneInBio, matchDateOfBirth, matchProfiles,
  calculateMatchScore
} from '../src/matching';

// ==================== EDGE CASES ====================

describe('matchName edge cases', () => {
  // Nickname variations
  it('Robert/Bob', () => expect(matchName('Robert Johnson', 'Bob Johnson')).toBeGreaterThanOrEqual(0.9));
  it('Elizabeth/Liz', () => expect(matchName('Elizabeth Warren', 'Liz Warren')).toBeGreaterThanOrEqual(0.9));
  it('Michael/Mike', () => expect(matchName('Michael Scott', 'Mike Scott')).toBeGreaterThanOrEqual(0.9));
  it('Jennifer/Jen', () => expect(matchName('Jennifer Lopez', 'Jen Lopez')).toBeGreaterThanOrEqual(0.9));
  it('Christopher/Chris', () => expect(matchName('Christopher Nolan', 'Chris Nolan')).toBeGreaterThanOrEqual(0.9));
  it('Katherine/Kate', () => expect(matchName('Katherine Smith', 'Kate Smith')).toBeGreaterThanOrEqual(0.9));
  
  // Fuzzy matching
  it('typo in first name', () => expect(matchName('Jane Doe', 'Jnae Doe')).toBeGreaterThan(0.7));
  it('typo in last name', () => expect(matchName('Jane Doe', 'Jane Deo')).toBeGreaterThanOrEqual(0.7));
  it('extra space', () => expect(matchName('Jane Doe', 'Jane  Doe')).toBeGreaterThan(0.8));
  
  // Edge cases
  it('single name', () => expect(matchName('Madonna', 'Madonna')).toBe(1));
  it('three part name', () => expect(matchName('Mary Jane Watson', 'Mary Jane Watson')).toBe(1));
  it('empty string person', () => expect(matchName('', 'Jane')).toBe(0));
  it('empty string profile', () => expect(matchName('Jane', '')).toBe(0));
  it('both empty', () => expect(matchName('', '')).toBe(0));
  it('whitespace only', () => expect(matchName('   ', '   ')).toBe(0));
});

describe('matchLocation edge cases', () => {
  // More aliases
  it('NYC/New York City', () => expect(matchLocation('New York City', 'NYC')).toBeGreaterThanOrEqual(0.85));
  it('LA/Los Angeles', () => expect(matchLocation('Los Angeles', 'LA')).toBeGreaterThanOrEqual(0.85));
  it('Bay Area/SF', () => expect(matchLocation('Bay Area', 'San Francisco')).toBeGreaterThanOrEqual(0.85));
  
  // Partial matches
  it('state included', () => expect(matchLocation('San Francisco', 'San Francisco, CA')).toBeGreaterThanOrEqual(0.8));
  it('country included', () => expect(matchLocation('New York', 'New York, USA')).toBeGreaterThan(0.7));
  
  // Edge cases  
  it('empty strings', () => expect(matchLocation('', '')).toBe(0));
  it('completely different', () => expect(matchLocation('Tokyo, Japan', 'London, UK')).toBeLessThan(0.3));
});

describe('matchEmployerInBio edge cases', () => {
  it('employer at start of bio', () => expect(matchEmployerInBio('Google', 'Google engineer since 2020')).toBe(1));
  it('employer at end of bio', () => expect(matchEmployerInBio('Google', 'Senior engineer at Google')).toBe(1));
  it('employer with different case', () => expect(matchEmployerInBio('GOOGLE', 'Works at google')).toBe(1));
  it('partial company name', () => expect(matchEmployerInBio('Google Inc', 'Engineer at Google')).toBeGreaterThan(0));
  it('company with special chars', () => expect(matchEmployerInBio('AT&T', 'Working at AT&T')).toBe(1));
  it('empty bio', () => expect(matchEmployerInBio('Google', '')).toBe(0));
  it('empty employer', () => expect(matchEmployerInBio('', 'Works at Google')).toBe(0));
});

describe('matchJobTitleInBio edge cases', () => {
  it('exact match at start', () => expect(matchJobTitleInBio('Engineer', 'Engineer at Acme')).toBe(1));
  it('title with level', () => expect(matchJobTitleInBio('Software Engineer', 'Senior Software Engineer')).toBe(1));
  it('abbreviated title', () => expect(matchJobTitleInBio('Software Engineer', 'SWE at Google')).toBe(0)); // Won't match abbreviation
  it('different role', () => expect(matchJobTitleInBio('Designer', 'Software Engineer')).toBe(0));
  it('manager title', () => expect(matchJobTitleInBio('Product Manager', 'Product Manager | Speaker')).toBe(1));
});

describe('matchEmailToUsername edge cases', () => {
  // Various formats
  it('email with dots', () => expect(matchEmailToUsername('john.doe@email.com', 'johndoe')).toBeGreaterThanOrEqual(0.9));
  it('email with numbers', () => expect(matchEmailToUsername('john123@email.com', 'john')).toBeGreaterThanOrEqual(0.7));
  it('email with underscore', () => expect(matchEmailToUsername('john_doe@email.com', 'johndoe')).toBeGreaterThanOrEqual(0.9));
  it('email with hyphen', () => expect(matchEmailToUsername('john-doe@email.com', 'johndoe')).toBeGreaterThanOrEqual(0.9));
  
  // Multiple emails
  it('second email matches', () => expect(matchEmailToUsername(['work@company.com', 'janedoe@gmail.com'], 'janedoe')).toBe(1));
  it('no emails match', () => expect(matchEmailToUsername(['alice@email.com', 'bob@email.com'], 'charlie')).toBe(0));
  
  // Edge cases
  it('empty array', () => expect(matchEmailToUsername([], 'john')).toBe(0));
  it('invalid email format', () => expect(matchEmailToUsername('notanemail', 'notanemail')).toBe(1)); // Still matches as string
});

describe('matchPhoneInBio edge cases', () => {
  // Various formats
  it('formatted phone', () => expect(matchPhoneInBio('(555) 123-4567', 'Call: 5551234567')).toBe(1));
  it('international format', () => expect(matchPhoneInBio('+1-555-123-4567', 'Phone: 5551234567')).toBe(1));
  it('spaces in phone', () => expect(matchPhoneInBio('555 123 4567', '5551234567 is my number')).toBe(1));
  
  // Multiple phones
  it('array of phones - first matches', () => expect(matchPhoneInBio(['555-111-1111', '555-222-2222'], 'Call 5551111111')).toBe(1));
  it('array of phones - second matches', () => expect(matchPhoneInBio(['555-111-1111', '555-222-2222'], 'Call 5552222222')).toBe(1));
  
  // Edge cases
  it('partial number in bio', () => expect(matchPhoneInBio('555-123-4567', 'Random number 12345')).toBe(0));
  it('short phone', () => expect(matchPhoneInBio('123', 'Call 123')).toBe(0)); // Too short
});

describe('matchDateOfBirth edge cases', () => {
  // Various date formats
  it('ISO date', () => expect(matchDateOfBirth('1990-05-15', 'Born in 1990')).toBe(1));
  it('US date', () => expect(matchDateOfBirth('05/15/1990', 'Born 1990')).toBe(1));
  it('written date', () => expect(matchDateOfBirth('May 15, 1990', 'Class of 1990')).toBe(0)); // Won't match "class of"
  
  // Age patterns - these give partial scores (0.7) when year matches indirectly
  it('years old pattern', () => {
    const year = new Date().getFullYear() - 30;
    const score = matchDateOfBirth(`${year}-01-01`, '30 years old');
    expect(score).toBeGreaterThanOrEqual(0.7); // Partial match via year
  });
  it('yo abbreviation', () => {
    const year = new Date().getFullYear() - 25;
    const score = matchDateOfBirth(`${year}-01-01`, '25yo developer');
    expect(score).toBeGreaterThanOrEqual(0.7);
  });
  
  // Edge cases
  it('year off by one', () => {
    // This tests a year mismatch - algorithm still gives partial credit
    expect(matchDateOfBirth('1990-12-31', 'Born 1995')).toBeLessThan(1);
  });
  it('invalid date', () => expect(matchDateOfBirth('not-a-date', 'Born 1990')).toBe(0));
  it('future date match', () => expect(matchDateOfBirth('2050-01-01', 'Born 2050')).toBeGreaterThanOrEqual(0.7));
});

// ==================== INTEGRATION TESTS ====================

describe('calculateMatchScore integration', () => {
  it('perfect match - all fields', () => {
    const person = {
      name: 'Jane Doe',
      email: 'janedoe@example.com',
      phone: '555-123-4567',
      location: 'San Francisco, CA',
      dateOfBirth: '1990-05-15',
      employer: 'Acme Corp',
      jobTitle: 'Software Engineer',
    };
    const profile = {
      platform: 'linkedin',
      username: 'janedoe',
      displayName: 'Jane Doe',
      bio: 'Software Engineer at Acme Corp | Born 1990 | 5551234567',
      location: 'San Francisco, CA',
    };
    const result = calculateMatchScore(person, profile);
    expect(result.score).toBeGreaterThanOrEqual(0.95);
    expect(result.factors.name_match).toBe(1);
    expect(result.factors.location_match).toBe(1);
    expect(result.factors.employer_in_bio).toBe(1);
  });

  it('partial match - some fields missing', () => {
    const person = { name: 'Jane Doe', location: 'NYC' };
    const profile = {
      platform: 'twitter',
      username: 'jane123',
      displayName: 'Jane Doe',
      location: 'New York',
    };
    const result = calculateMatchScore(person, profile);
    expect(result.score).toBeGreaterThan(0.8);
  });

  it('no match - completely different person', () => {
    const person = { name: 'John Smith', location: 'London' };
    const profile = {
      platform: 'linkedin',
      username: 'alice',
      displayName: 'Alice Wong',
      location: 'Tokyo',
    };
    const result = calculateMatchScore(person, profile);
    expect(result.score).toBeLessThan(0.3);
  });

  it('only name provided', () => {
    const person = { name: 'Jane Doe' };
    const profile = { platform: 'twitter', username: 'jane', displayName: 'Jane Doe' };
    const result = calculateMatchScore(person, profile);
    expect(result.score).toBe(1); // Only name matters, and it matches perfectly
  });

  it('handles snake_case display_name', () => {
    const person = { name: 'Jane Doe' };
    const profile = { platform: 'twitter', username: 'jane', display_name: 'Jane Doe' } as any;
    const result = calculateMatchScore(person, profile);
    expect(result.factors.name_match).toBe(1);
  });
});

describe('matchProfiles ranking', () => {
  it('correctly ranks 3+ profiles', () => {
    const person = { name: 'Jane Doe', employer: 'Acme Corp', location: 'San Francisco' };
    const profiles = [
      { platform: 'github', username: 'random', displayName: 'Random User', location: 'Tokyo' },
      { platform: 'twitter', username: 'jdoe', displayName: 'J. Doe', location: 'SF' },
      { platform: 'linkedin', username: 'janedoe', displayName: 'Jane Doe', bio: 'Engineer at Acme Corp', location: 'San Francisco Bay Area' },
    ];
    const results = matchProfiles(person, profiles);
    
    expect(results[0].profile.platform).toBe('linkedin'); // Best match
    expect(results[1].profile.platform).toBe('twitter');  // Middle match
    expect(results[2].profile.platform).toBe('github');   // Worst match
    
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  it('handles ties gracefully', () => {
    const person = { name: 'Jane' };
    const profiles = [
      { platform: 'twitter', username: 'jane1', displayName: 'Jane' },
      { platform: 'linkedin', username: 'jane2', displayName: 'Jane' },
    ];
    const results = matchProfiles(person, profiles);
    expect(results.length).toBe(2);
    expect(results[0].score).toBe(results[1].score);
  });

  it('handles empty profiles array', () => {
    const person = { name: 'Jane' };
    const results = matchProfiles(person, []);
    expect(results).toEqual([]);
  });

  it('handles person with no matching fields', () => {
    const person = { dateOfBirth: '1990-01-01' }; // Only DOB, no bio to match against
    const profiles = [{ platform: 'twitter', username: 'jane', displayName: 'Jane' }];
    const results = matchProfiles(person, profiles);
    expect(results[0].score).toBe(0);
  });
});

// ==================== SAMPLE FROM SPEC ====================

describe('spec sample request', () => {
  it('matches spec example correctly', () => {
    const person = {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      location: 'San Francisco, CA',
      employer: 'Acme Corp',
    };
    const profiles = [
      {
        platform: 'linkedin',
        username: 'janedoe',
        displayName: 'Jane Doe', // Using camelCase
        bio: 'Software Engineer at Acme Corp',
        location: 'San Francisco Bay Area',
      },
      {
        platform: 'twitter',
        username: 'jdoe1985',
        displayName: 'J. Doe',
        bio: 'Coffee enthusiast',
        location: 'NYC',
      },
    ];
    
    const results = matchProfiles(person, profiles);
    
    // LinkedIn should rank first
    expect(results[0].profile.platform).toBe('linkedin');
    expect(results[0].score).toBeGreaterThanOrEqual(0.9);
    
    // Twitter should rank second with lower score
    expect(results[1].profile.platform).toBe('twitter');
    expect(results[1].score).toBeLessThan(0.5);
    
    // Verify factors are present
    expect(results[0].factors).toHaveProperty('name_match');
    expect(results[0].factors).toHaveProperty('location_match');
    expect(results[0].factors).toHaveProperty('employer_in_bio');
    expect(results[0].factors).toHaveProperty('email_username_match');
  });

  it('matches spec with snake_case fields', () => {
    const person = {
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      location: 'San Francisco, CA',
      employer: 'Acme Corp',
    };
    const profiles = [
      {
        platform: 'linkedin',
        username: 'janedoe',
        display_name: 'Jane Doe', // snake_case as in spec
        bio: 'Software Engineer at Acme Corp',
        location: 'San Francisco Bay Area',
      },
    ] as any;
    
    const results = matchProfiles(person, profiles);
    expect(results[0].score).toBeGreaterThanOrEqual(0.9);
  });
});

// ==================== STRESS TESTS ====================

describe('stress tests', () => {
  it('handles 20 profiles (max allowed)', () => {
    const person = { name: 'Jane Doe' };
    const profiles = Array.from({ length: 20 }, (_, i) => ({
      platform: 'test',
      username: `user${i}`,
      displayName: i === 10 ? 'Jane Doe' : `User ${i}`,
    }));
    
    const results = matchProfiles(person, profiles);
    expect(results.length).toBe(20);
    expect(results[0].profile.username).toBe('user10'); // The matching one should be first
  });

  it('handles very long strings', () => {
    const longBio = 'Software Engineer at Acme Corp ' + 'lorem ipsum '.repeat(1000);
    const result = matchEmployerInBio('Acme Corp', longBio);
    expect(result).toBe(1);
  });

  it('handles special characters in name', () => {
    expect(matchName("O'Connor", "O'Connor")).toBe(1);
    expect(matchName('José García', 'José García')).toBe(1);
    expect(matchName('Müller', 'Müller')).toBe(1);
  });

  it('handles unicode in bio', () => {
    const result = matchEmployerInBio('Google', '🚀 Engineer at Google 💻');
    expect(result).toBe(1);
  });
});
