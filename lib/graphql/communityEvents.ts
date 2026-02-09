/**
 * GraphQL query for fetching community events (rides and workshops).
 * Includes event details, ride levels with guides, and logistics info.
 */

export const GET_KANDIE_EVENTS_QUERY = `
  query GetKandieEvents($first: Int!) {
    rideEvents(first: $first) {
      nodes {
        databaseId
        title
        featuredImage {
          node {
            sourceUrl
          }
        }
        eventDetails {
          # Core Logic
          primaryType
          eventDate
          description
          
          # Workshop Specifics
          workshopCapacity
          workshopStartTime
          
          # Ride Category
          rideCategory
          
          # Levels (With Guide Avatars)
          level1 {
            routeUrl
            gpxFile { node { mediaItemUrl } }
            guides {
              nodes {
                ... on RideGuide {
                  title
                  featuredImage { node { sourceUrl } }
                }
              }
            }
          }
          level2 {
            routeUrl
            guides {
              nodes {
                ... on RideGuide {
                  title
                  featuredImage { node { sourceUrl } }
                }
              }
            }
          }
          level2plus {
            routeUrl
            guides {
              nodes {
                ... on RideGuide {
                  title
                  featuredImage { node { sourceUrl } }
                }
              }
            }
          }
          level3 {
            routeUrl
            guides {
              nodes {
                ... on RideGuide {
                  title
                  featuredImage { node { sourceUrl } }
                }
              }
            }
          }

          # Logistics & FLINTA
          isFlintaOnly
          publicReleaseDate
          meetingPoint {
            name
            street
            city
          }
        }
      }
    }
  }
`;

/**
 * GraphQL query for fetching a single event by slug
 */
export const GET_KANDIE_EVENT_QUERY = `
  query GetKandieEvent($slug: ID!) {
    rideEvent(id: $slug, idType: SLUG) {
      databaseId
      title
      featuredImage {
        node {
          sourceUrl
        }
      }
      eventDetails {
        # Core Logic
        primaryType
        eventDate
        description
        
        # Workshop Specifics
        workshopCapacity
        workshopStartTime
        
        # Ride Category
        rideCategory
        
        # Levels (With Guide Avatars)
        level1 {
          routeUrl
          gpxFile { node { mediaItemUrl } }
          guides {
            nodes {
              ... on RideGuide {
                title
                featuredImage { node { sourceUrl } }
              }
            }
          }
        }
        level2 {
          routeUrl
          guides {
            nodes {
              ... on RideGuide {
                title
                featuredImage { node { sourceUrl } }
              }
            }
          }
        }
        level2plus {
          routeUrl
          guides {
            nodes {
              ... on RideGuide {
                title
                featuredImage { node { sourceUrl } }
              }
            }
          }
        }
        level3 {
          routeUrl
          guides {
            nodes {
              ... on RideGuide {
                title
                featuredImage { node { sourceUrl } }
              }
            }
          }
        }

        # Logistics & FLINTA
        isFlintaOnly
        publicReleaseDate
        meetingPoint {
          name
          street
          city
        }
      }
    }
  }
`;

