import type { ActorContext } from '../contracts'

/** A implements persisted key lookup, revocation and live user status on every request. */
export type Authenticate = (token: string, requestID: string) => Promise<ActorContext | null>
