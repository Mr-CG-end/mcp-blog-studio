import type { CollectionAfterReadHook } from 'payload'

// The `user` collection has access control locked so that users are not publicly accessible
// This means that we need to populate the authors manually here to protect user privacy
// GraphQL will not return mutated user data that differs from the underlying schema
// So we use an alternative `populatedAuthors` field to populate the user data, hidden from the admin UI
export const populateAuthors: CollectionAfterReadHook = async ({ doc, req }) => {
  const targetAuthors =
    doc?.authors && Array.isArray(doc.authors) && doc.authors.length > 0
      ? doc.authors
      : doc?.owner
        ? [doc.owner]
        : []

  if (targetAuthors.length > 0) {
    const authorDocs: { id: string | number; name: string; avatarUrl: string | null }[] = []

    for (const author of targetAuthors) {
      try {
        const authorId = typeof author === 'object' && author !== null ? author.id : author
        if (!authorId) continue

        const authorDoc = await req.payload.findByID({
          req,
          overrideAccess: true,
          id: authorId,
          collection: 'users',
          depth: 1,
        })

        if (authorDoc) {
          let avatarUrl: string | null = null
          if (authorDoc.avatar) {
            if (
              typeof authorDoc.avatar === 'object' &&
              authorDoc.avatar !== null &&
              'url' in authorDoc.avatar
            ) {
              avatarUrl = (authorDoc.avatar as { url?: string | null }).url || null
            } else if (
              typeof authorDoc.avatar === 'number' ||
              typeof authorDoc.avatar === 'string'
            ) {
              try {
                const mediaDoc = await req.payload.findByID({
                  req,
                  overrideAccess: true,
                  id: authorDoc.avatar,
                  collection: 'media',
                  depth: 0,
                })
                avatarUrl = mediaDoc?.url || null
              } catch {
                // ignore
              }
            }
          }

          authorDocs.push({
            id: authorDoc.id,
            name: authorDoc.name,
            avatarUrl,
          })
        }
      } catch {
        // swallow error
      }
    }

    if (authorDocs.length > 0) {
      doc.populatedAuthors = authorDocs.map((authorDoc) => ({
        id: String(authorDoc.id),
        name: authorDoc.name,
        avatar: authorDoc.avatarUrl,
      }))
    }
  }

  return doc
}
