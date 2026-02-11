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
  description: string;
  excerpt?: string;
  workshopCapacity?: number;
  workshopStartTime?: string;
  level1?: RideLevel;
  level2?: RideLevel;
  level2plus?: RideLevel;
  level3?: RideLevel;
  isFlintaOnly?: boolean;
  publicReleaseDate?: string;
  repeatingEvent?: boolean;
  meetingPoint?: MeetingPoint;
}

export interface KandieEventData {
  databaseId: string;
  title: string;
  excerpt?: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
      altText?: string;
    };
  };
  eventDetails?: EventDetails;
}
