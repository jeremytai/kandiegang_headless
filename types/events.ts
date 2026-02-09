/**
 * Event types for Kandie Gang rides and workshops
 */

export interface RideGuide {
  title: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
    };
  };
}

export interface RideLevel {
  routeUrl?: string;
  gpxFile?: {
    node: {
      mediaItemUrl: string;
    };
  };
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
  eventDate: string;
  description: string;
  workshopCapacity?: number;
  workshopStartTime?: string;
  rideCategory?: string;
  level1?: RideLevel;
  level2?: RideLevel;
  level2plus?: RideLevel;
  level3?: RideLevel;
  isFlintaOnly?: boolean;
  publicReleaseDate?: string;
  meetingPoint?: MeetingPoint;
}

export interface KandieEventData {
  databaseId: string;
  title: string;
  featuredImage?: {
    node: {
      sourceUrl: string;
    };
  };
  eventDetails?: EventDetails;
}
