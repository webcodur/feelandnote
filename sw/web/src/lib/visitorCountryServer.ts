import { cache } from 'react'
import { headers } from 'next/headers'
import { parseVisitorCountry } from './visitorCountry'

/** Read outside unstable_cache; callers pass the result into country-specific cache keys. */
export const getVisitorCountry = cache(async () => parseVisitorCountry((await headers()).get('CF-IPCountry')))
