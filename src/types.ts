import { z } from 'zod';

export const PersonSchema = z.object({
  name: z.string().optional(),
  email: z.union([z.string(), z.array(z.string())]).optional(),
  phone: z.union([z.string(), z.array(z.string())]).optional(),
  location: z.string().optional(),
  dateOfBirth: z.string().optional(),
  employer: z.string().optional(),
  jobTitle: z.string().optional(),
});

export const ProfileSchema = z.object({
  platform: z.string(),
  username: z.string(),
  displayName: z.string().optional(),
  display_name: z.string().optional(), // snake_case alias
  bio: z.string().optional(),
  location: z.string().optional(),
  profileUrl: z.string().optional(),
  profile_url: z.string().optional(), // snake_case alias
});

export const MatchRequestSchema = z.object({
  person: PersonSchema,
  profiles: z.array(ProfileSchema).min(1).max(20),
});

export type Person = z.infer<typeof PersonSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type MatchRequest = z.infer<typeof MatchRequestSchema>;

export interface MatchFactors {
  [key: string]: number | string;
}

export interface MatchResult {
  profile: Profile;
  score: number;
  factors: MatchFactors;
}

export interface MatchResponse {
  matches: MatchResult[];
}
