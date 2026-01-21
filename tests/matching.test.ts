import { describe, it, expect } from 'vitest';
import { 
  matchName, matchLocation, matchEmployerInBio, matchEmailToUsername, 
  matchJobTitleInBio, matchPhoneInBio, matchDateOfBirth, matchProfiles 
} from '../src/matching';

describe('matchName', () => {
  it('exact match returns 1', () => expect(matchName('Jane Doe', 'Jane Doe')).toBe(1));
  it('case insensitive', () => expect(matchName('JANE DOE', 'jane doe')).toBe(1));
  it('nickname William/Bill', () => expect(matchName('William Smith', 'Bill Smith')).toBeGreaterThanOrEqual(0.9));
  it('initial J. Doe', () => expect(matchName('Jane Doe', 'J. Doe')).toBeGreaterThanOrEqual(0.5));
  it('no match', () => expect(matchName('Jane Doe', 'Bob Smith')).toBeLessThan(0.3));
  it('undefined', () => expect(matchName(undefined, 'Jane')).toBe(0));
});

describe('matchLocation', () => {
  it('exact match', () => expect(matchLocation('NYC', 'NYC')).toBe(1));
  it('alias SF/San Francisco', () => expect(matchLocation('San Francisco', 'SF')).toBeGreaterThanOrEqual(0.85));
  it('containment', () => expect(matchLocation('San Francisco', 'San Francisco Bay Area')).toBeGreaterThanOrEqual(0.8));
  it('undefined', () => expect(matchLocation(undefined, 'NYC')).toBe(0));
});

describe('matchEmployerInBio', () => {
  it('exact mention', () => expect(matchEmployerInBio('Acme Corp', 'Engineer at Acme Corp')).toBe(1));
  it('partial match', () => expect(matchEmployerInBio('Acme Corporation', 'Working at Acme')).toBeGreaterThan(0));
  it('no match', () => expect(matchEmployerInBio('Google', 'Engineer at Microsoft')).toBe(0));
});

describe('matchJobTitleInBio', () => {
  it('exact title', () => expect(matchJobTitleInBio('Software Engineer', 'Software Engineer at Acme')).toBe(1));
  it('partial match', () => expect(matchJobTitleInBio('Software Engineer', 'Senior Engineer')).toBeGreaterThanOrEqual(0.3));
  it('no match', () => expect(matchJobTitleInBio('CEO', 'Junior Developer')).toBe(0));
  it('undefined', () => expect(matchJobTitleInBio(undefined, 'Some bio')).toBe(0));
});

describe('matchEmailToUsername', () => {
  it('exact username', () => expect(matchEmailToUsername('janedoe@example.com', 'janedoe')).toBe(1));
  it('normalized match', () => expect(matchEmailToUsername('jane.doe@example.com', 'janedoe')).toBeGreaterThanOrEqual(0.9));
  it('array of emails', () => expect(matchEmailToUsername(['work@co.com', 'janedoe@gmail.com'], 'janedoe')).toBe(1));
});

describe('matchPhoneInBio', () => {
  it('exact phone in bio', () => expect(matchPhoneInBio('555-123-4567', 'Call me at 5551234567')).toBe(1));
  it('local number match', () => expect(matchPhoneInBio('+1-555-123-4567', 'Contact: 1234567')).toBeGreaterThanOrEqual(0.8));
  it('no match', () => expect(matchPhoneInBio('555-123-4567', 'No phone here')).toBe(0));
  it('undefined', () => expect(matchPhoneInBio(undefined, 'bio')).toBe(0));
});

describe('matchDateOfBirth', () => {
  it('birth year in bio', () => expect(matchDateOfBirth('1990-05-15', 'Born 1990, love coding')).toBe(1));
  it('age in bio', () => {
    const age = new Date().getFullYear() - 1990;
    expect(matchDateOfBirth('1990-05-15', `${age} years old`)).toBe(1);
  });
  it('no match', () => expect(matchDateOfBirth('1990-05-15', 'No date here')).toBe(0));
  it('undefined', () => expect(matchDateOfBirth(undefined, 'bio')).toBe(0));
});

describe('matchProfiles', () => {
  it('ranks profiles by score', () => {
    const person = { name: 'Jane Doe', employer: 'Acme Corp', location: 'SF' };
    const profiles = [
      { platform: 'twitter', username: 'random', displayName: 'Someone', location: 'NYC' },
      { platform: 'linkedin', username: 'janedoe', displayName: 'Jane Doe', bio: 'Engineer at Acme Corp', location: 'Bay Area' },
    ];
    const results = matchProfiles(person, profiles);
    expect(results[0].profile.platform).toBe('linkedin');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('supports snake_case display_name', () => {
    const person = { name: 'Jane Doe' };
    const profiles = [{ platform: 'twitter', username: 'jane', display_name: 'Jane Doe' }];
    const results = matchProfiles(person, profiles as any);
    expect(results[0].factors.name_match).toBe(1);
  });
});
