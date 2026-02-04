export type SizeCategory =
  | "small"
  | "medium"
  | "large"
  | "extra-large";

export type Environment =
  | "indoor"
  | "outdoor"
  | "mixed";

export type Utility =
  | "electricity"
  | "water"
  | "wifi"
  | "hvac"
  | "gas";

export type Duration =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "long-term";

export type PrivacyLevel =
  | "private"
  | "semi-private"
  | "shared";

export type NoiseLevel =
  | "quiet"
  | "moderate"
  | "loud";

export type UserType =
  | "artist"
  | "musician"
  | "maker"
  | "photographer"
  | "craftsperson"
  | "educator"
  | "entrepreneur"
  | "other";

export interface PostAttributes {
  sizeCategory?: SizeCategory;
  environment?: Environment;
  utilities?: Utility[];
  budget?: {
    min: number;
    max: number;
    period: Duration;
  };
  duration?: Duration;
  location?: string;
  hasParking?: boolean;
  privacyLevel?: PrivacyLevel;
  hasRestroom?: boolean;
  adaAccessible?: boolean;
  petsAllowed?: boolean;
  climateControlled?: boolean;
  noiseLevel?: NoiseLevel;
  userTypes?: UserType[];
  customTags?: string[];
}

export const SIZE_OPTIONS: { value: SizeCategory; label: string; description: string }[] = [
  { value: "small", label: "Small", description: "< 200 sq ft" },
  { value: "medium", label: "Medium", description: "200-500 sq ft" },
  { value: "large", label: "Large", description: "500-1000 sq ft" },
  { value: "extra-large", label: "Extra Large", description: "1000+ sq ft" },
];

export const ENVIRONMENT_OPTIONS: { value: Environment; label: string }[] = [
  { value: "indoor", label: "Indoor" },
  { value: "outdoor", label: "Outdoor" },
  { value: "mixed", label: "Indoor/Outdoor" },
];

export const UTILITY_OPTIONS: { value: Utility; label: string }[] = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "wifi", label: "WiFi" },
  { value: "hvac", label: "HVAC" },
  { value: "gas", label: "Gas" },
];

export const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "long-term", label: "Long-term" },
];

export const PRIVACY_OPTIONS: { value: PrivacyLevel; label: string }[] = [
  { value: "private", label: "Private" },
  { value: "semi-private", label: "Semi-Private" },
  { value: "shared", label: "Shared" },
];

export const NOISE_OPTIONS: { value: NoiseLevel; label: string }[] = [
  { value: "quiet", label: "Quiet" },
  { value: "moderate", label: "Moderate" },
  { value: "loud", label: "Loud OK" },
];

export const USER_TYPE_OPTIONS: { value: UserType; label: string }[] = [
  { value: "artist", label: "Artist" },
  { value: "musician", label: "Musician" },
  { value: "maker", label: "Maker" },
  { value: "photographer", label: "Photographer" },
  { value: "craftsperson", label: "Craftsperson" },
  { value: "educator", label: "Educator" },
  { value: "entrepreneur", label: "Entrepreneur" },
  { value: "other", label: "Other" },
];
