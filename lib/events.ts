/**
 * Event types for Kandie Gang rides and workshops
 */

export interface RideGuide {
  title: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText?: string;
    };
  };
}

export interface RideLevel {
  distanceKm?: number | null;
  routeUrl?: string;
  gpxFile?: string;
  guides?: {
    nodes: RideGuide[];
  };
}

export interface MeetingPoint {
  name?: string;
  street?: string;
  city?: string;
}

export interface EventDetails {
  primaryType: string;
  rideCategory?: string;
  eventDate: string;
  rideTime?: string;
  description: string;
  excerpt?: string;
  workshopCapacity?: number;
  workshopStartTime?: string;
  level1?: RideLevel;
  level2?: RideLevel;
  level2plus?: RideLevel;
  level3?: RideLevel;
  isFlintaOnly?: boolean;
  repeatingEvent?: boolean;
  meetingPoint?: MeetingPoint;
}

export interface KandieEventData {
  slug: string;
  databaseId: string;
  title: string;
  excerpt?: string;
  publicReleaseDate?: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText?: string;
    };
  };
  eventDetails?: EventDetails;
}
