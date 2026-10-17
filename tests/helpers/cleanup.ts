import type { Payload, Where } from 'payload'

/** Payload bulk deletion runs per-document work concurrently on one transaction client. */
export async function cleanupRecords(
  payload: Payload,
  collection: 'audit-logs' | 'mcp-idempotency' | 'mcp-keys',
  where: Where,
) {
  const { docs } = await payload.find({
    collection,
    where,
    overrideAccess: true,
    pagination: false,
    depth: 0,
  })
  for (const { id } of docs) await payload.delete({ collection, id, overrideAccess: true })
}
