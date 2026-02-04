/**
 * GraphQL query for fetching a single post's editor blocks (paragraphs, images, galleries)
 * plus media items for resolving gallery attachment ids.
 * Pass post slug as the $slug variable when running.
 */

export const STORY_BLOCKS_QUERY = `
  query StoryBlocks($slug: ID!) {
    post(id: $slug, idType: SLUG) {
      title
      excerpt
      date
      uri
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      editorBlocks {
        name
        ... on CoreParagraph {
          attributes { content }
        }
        ... on CoreImage {
          attributes {
            id
            url
            alt
            caption
            width
            height
          }
        }
        ... on CoreGallery {
          attributes { ids columns }
        }
      }
    }
    mediaItems(first: 200) {
      nodes {
        id
        sourceUrl
        altText
        caption
        mediaDetails { width height }
      }
    }
  }
`;
