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
          gravelPace
          gravelDistanceKm
          gravelRouteUrl
          gravelGuides {
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

          # Levels (With Guide Avatars)
          level1 {
            distanceKm
            routeUrl
            gpxFile
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
            gpxFile
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
            gpxFile
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
            gpxFile
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
          repeatUntil
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
        gravelPace
        gravelDistanceKm
        gravelRouteUrl
        gravelGuides {
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
        
        # Levels (With Guide Avatars)
        level1 {
          distanceKm
          routeUrl
          gpxFile
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
          gpxFile
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
          gpxFile
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
          gpxFile
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
        repeatUntil
        meetingPoint {
          name
          street
          city
        }
      }
    }
  }
`;

/**
 * GraphQL query for fetching a series event by slug plus its occurrence (hard requirement).
 * The occurrence is resolved by the route's date (Y-m-d).
 */
export const GET_KANDIE_EVENT_WITH_OCCURRENCE_QUERY = `
  query GetKandieEventWithOccurrence($slug: ID!, $date: String!) {
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
        primaryType
        eventDate
        rideTime
        description
        workshopCapacity
        workshopStartTime
        rideCategory
        gravelPace
        gravelDistanceKm
        gravelRouteUrl
        gravelGuides {
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
        level1 {
          distanceKm
          routeUrl
          gpxFile
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
          gpxFile
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
          gpxFile
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
          gpxFile
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
        isFlintaOnly
        repeatingEvent
        meetingPoint {
          name
          street
          city
        }
      }

      occurrenceByDate(date: $date) {
        databaseId
        occurrenceDetails {
          occurrenceDate
          occurrenceImage
          occurrenceLevel1Guides {
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
          occurrenceLevel2Guides {
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
          occurrenceLevel2plusGuides {
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
          occurrenceLevel3Guides {
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
          occurrenceGravelGuides {
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
      }
    }
  }
`;
