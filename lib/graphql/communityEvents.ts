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
        excerpt
        publicReleaseDate
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        eventDetails {
          # Core Logic
          primaryType
          eventDate
          rideTime
          description
          
          # Workshop Specifics
          workshopCapacity
          workshopStartTime
          
          # Ride Category
          rideCategory
          
          # Levels (With Guide Avatars)
          level1 {
            distanceKm
            routeUrl
            gpxFile {
              node {
                id
              }
            }
            guides {
              nodes {
                ... on RideGuide {
                  databaseId
                  title
                  featuredImage {
                    node {
                      sourceUrl
                      altText
                    }
                  }
                }
              }
            }
          }
          level2 {
            distanceKm
            routeUrl
            gpxFile {
              node {
                id
              }
            }
            guides {
              nodes {
                ... on RideGuide {
                  databaseId
                  title
                  featuredImage {
                    node {
                      sourceUrl
                      altText
                    }
                  }
                }
              }
            }
          }
          level2plus {
            distanceKm
            routeUrl
            gpxFile {
              node {
                id
              }
            }
            guides {
              nodes {
                ... on RideGuide {
                  databaseId
                  title
                  featuredImage {
                    node {
                      sourceUrl
                      altText
                    }
                  }
                }
              }
            }
          }
          level3 {
            distanceKm
            routeUrl
            gpxFile {
              node {
                id
              }
            }
            guides {
              nodes {
                ... on RideGuide {
                  databaseId
                  title
                  featuredImage {
                    node {
                      sourceUrl
                      altText
                    }
                  }
                }
              }
            }
          }

          # Logistics & FLINTA
          isFlintaOnly
          repeatingEvent
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
      excerpt
      publicReleaseDate
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      eventDetails {
        # Core Logic
        primaryType
        eventDate
        rideTime
        description
        
        # Workshop Specifics
        workshopCapacity
        workshopStartTime
        
        # Ride Category
        rideCategory
        
        # Levels (With Guide Avatars)
        level1 {
          distanceKm
          routeUrl
          gpxFile {
            node {
              id
            }
          }
          guides {
            nodes {
                ... on RideGuide {
                  databaseId
                  title
                  featuredImage {
                    node {
                      sourceUrl
                      altText
                    }
                  }
                }
            }
          }
        }
        level2 {
          distanceKm
          routeUrl
          gpxFile {
            node {
              id
            }
          }
          guides {
            nodes {
              ... on RideGuide {
                databaseId
                title
                featuredImage {
                  node {
                    sourceUrl
                    altText
                  }
                }
              }
            }
          }
        }
        level2plus {
          distanceKm
          routeUrl
          gpxFile {
            node {
              id
            }
          }
          guides {
            nodes {
              ... on RideGuide {
                databaseId
                title
                featuredImage {
                  node {
                    sourceUrl
                    altText
                  }
                }
              }
            }
          }
        }
        level3 {
          distanceKm
          routeUrl
          gpxFile {
            node {
              id
            }
          }
          guides {
            nodes {
              ... on RideGuide {
                databaseId
                title
                featuredImage {
                  node {
                    sourceUrl
                    altText
                  }
                }
              }
            }
          }
        }

        # Logistics & FLINTA
        isFlintaOnly
        repeatingEvent
        meetingPoint {
          name
          street
          city
        }
      }
    }
  }
`;
