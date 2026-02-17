import type {
  SizeCategory,
  Environment,
  Utility,
  Duration,
  PrivacyLevel,
  NoiseLevel,
  PostAttributes,
} from "@/types/attributes";
import type { ExternalListing } from "./types";

export function mapSizeCategory(sqft?: number): SizeCategory | undefined {
  if (sqft === undefined) return undefined;
  if (sqft < 500) return "small";
  if (sqft < 1000) return "medium";
  if (sqft < 2500) return "large";
  return "extra-large";
}

export function mapEnvironment(propertyType?: string): Environment | undefined {
  if (!propertyType) return undefined;
  const lower = propertyType.toLowerCase();
  if (["yard", "lot", "outdoor", "garden", "rooftop"].some((k) => lower.includes(k))) return "outdoor";
  if (["mixed-use", "mixed use", "flex"].some((k) => lower.includes(k))) return "mixed";
  return "indoor";
}

export function mapUtilities(amenities?: string[]): Utility[] {
  if (!amenities) return [];
  const lower = amenities.map((a) => a.toLowerCase());
  const utilities: Utility[] = [];
  if (lower.some((a) => a.includes("wifi") || a.includes("internet"))) utilities.push("wifi");
  if (lower.some((a) => a.includes("electric"))) utilities.push("electricity");
  if (lower.some((a) => a.includes("water"))) utilities.push("water");
  if (lower.some((a) => a.includes("hvac") || a.includes("air condition") || a.includes("heating"))) utilities.push("hvac");
  if (lower.some((a) => a.includes("gas"))) utilities.push("gas");
  return utilities;
}

export function mapPrivacyLevel(propertyType?: string): PrivacyLevel | undefined {
  if (!propertyType) return undefined;
  const lower = propertyType.toLowerCase();
  if (["coworking", "shared", "open"].some((k) => lower.includes(k))) return "shared";
  if (["suite", "semi"].some((k) => lower.includes(k))) return "semi-private";
  return "private";
}

export function mapDuration(leaseTerm?: string, pricePeriod?: string): Duration | undefined {
  const term = (leaseTerm || pricePeriod || "").toLowerCase();
  if (term.includes("hour")) return "hourly";
  if (term.includes("day") || term.includes("daily")) return "daily";
  if (term.includes("week")) return "weekly";
  if (term.includes("month")) return "monthly";
  if (term.includes("year") || term.includes("long") || term.includes("annual")) return "long-term";
  return undefined;
}

export function mapNoiseLevel(amenities?: string[]): NoiseLevel {
  if (!amenities) return "moderate";
  const lower = amenities.map((a) => a.toLowerCase());
  if (lower.some((a) => a.includes("soundproof") || a.includes("quiet"))) return "quiet";
  return "moderate";
}

function matchAmenity(amenities: string[], ...keywords: string[]): boolean {
  const lower = amenities.map((a) => a.toLowerCase());
  return lower.some((a) => keywords.some((k) => a.includes(k)));
}

export function mapUserTypes(propertyType?: string): string[] {
  if (!propertyType) return [];
  const lower = propertyType.toLowerCase();
  const types: string[] = [];
  if (["studio", "gallery", "art"].some((k) => lower.includes(k))) types.push("artist");
  if (["music", "recording", "rehearsal"].some((k) => lower.includes(k))) types.push("musician");
  if (["workshop", "maker", "fabrication"].some((k) => lower.includes(k))) types.push("maker");
  if (["photo", "studio"].some((k) => lower.includes(k))) types.push("photographer");
  if (["office", "coworking", "commercial"].some((k) => lower.includes(k))) types.push("entrepreneur");
  if (["classroom", "training"].some((k) => lower.includes(k))) types.push("educator");
  return Array.from(new Set(types));
}

function formatLocation(listing: ExternalListing): string | undefined {
  const parts: string[] = [];
  if (listing.neighborhood) parts.push(listing.neighborhood);
  if (listing.city) parts.push(listing.city);
  if (listing.state) parts.push(listing.state);
  if (parts.length > 0) return parts.join(", ");
  if (listing.address) return listing.address;
  return undefined;
}

export function generateSearchKeywords(
  title: string,
  description: string,
  attributes: PostAttributes,
): string[] {
  const keywords: string[] = [];
  keywords.push(...title.toLowerCase().split(/\s+/));
  keywords.push(...description.toLowerCase().split(/\s+/).slice(0, 100));

  if (attributes.sizeCategory) keywords.push(attributes.sizeCategory);
  if (attributes.environment) keywords.push(attributes.environment);
  if (attributes.utilities) keywords.push(...attributes.utilities);
  if (attributes.duration) keywords.push(attributes.duration);
  if (attributes.privacyLevel) keywords.push(attributes.privacyLevel);
  if (attributes.noiseLevel) keywords.push(attributes.noiseLevel);
  if (attributes.userTypes) keywords.push(...attributes.userTypes);
  if (attributes.customTags) keywords.push(...attributes.customTags.map((t) => t.toLowerCase()));
  if (attributes.location) keywords.push(...attributes.location.toLowerCase().split(/\s+/));
  if (attributes.hasParking) keywords.push("parking");
  if (attributes.hasRestroom) keywords.push("restroom", "bathroom");
  if (attributes.adaAccessible) keywords.push("ada", "accessible", "accessibility");
  if (attributes.petsAllowed) keywords.push("pets", "pet-friendly");
  if (attributes.climateControlled) keywords.push("climate", "ac", "heating");

  // Import-specific keywords
  keywords.push("imported");

  return Array.from(new Set(keywords)).filter((k) => k.length > 2);
}

export interface MappedPost {
  type: "space";
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  images: string[];
  attributes: PostAttributes;
  searchKeywords: string[];
  status: "active";
  source: string;
  externalId: string;
  externalUrl?: string;
  isImported: boolean;
}

export function mapExternalToPost(listing: ExternalListing): MappedPost {
  const amenities = listing.amenities || [];

  const attributes: PostAttributes = {
    sizeCategory: mapSizeCategory(listing.sqft),
    environment: mapEnvironment(listing.propertyType),
    utilities: mapUtilities(amenities),
    budget: listing.price
      ? {
          min: listing.price,
          max: listing.price,
          period: mapDuration(listing.leaseTerm, listing.pricePeriod) || "monthly",
        }
      : undefined,
    duration: mapDuration(listing.leaseTerm, listing.pricePeriod),
    location: formatLocation(listing),
    hasParking: matchAmenity(amenities, "parking"),
    privacyLevel: mapPrivacyLevel(listing.propertyType),
    hasRestroom: matchAmenity(amenities, "restroom", "bathroom"),
    adaAccessible: matchAmenity(amenities, "ada", "accessible", "wheelchair"),
    petsAllowed: matchAmenity(amenities, "pet", "dog", "cat"),
    climateControlled: matchAmenity(amenities, "hvac", "climate", "air condition", "heating"),
    noiseLevel: mapNoiseLevel(amenities),
    userTypes: mapUserTypes(listing.propertyType),
    customTags: listing.tags,
  };

  const searchKeywords = generateSearchKeywords(
    listing.title,
    listing.description,
    attributes,
  );

  return {
    type: "space",
    authorId: "system-import",
    authorName: "Spacematch Listings",
    title: listing.title,
    description: listing.description,
    images: listing.images || [],
    attributes,
    searchKeywords,
    status: "active",
    source: listing.source,
    externalId: listing.externalId,
    externalUrl: listing.externalUrl,
    isImported: true,
  };
}
