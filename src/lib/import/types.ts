export interface ExternalListing {
  externalId: string;
  source: string;
  title: string;
  description: string;
  externalUrl?: string;
  images?: string[];
  // Location
  address?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  // Size & type
  sqft?: number;
  propertyType?: string; // office, studio, warehouse, retail, mixed-use, coworking, lot, yard
  // Pricing
  price?: number;
  pricePeriod?: string; // hourly, daily, weekly, monthly, yearly
  // Amenities (free-form list)
  amenities?: string[];
  // Lease
  leaseTerm?: string; // hourly, daily, weekly, monthly, long-term
  // Extra
  tags?: string[];
}
