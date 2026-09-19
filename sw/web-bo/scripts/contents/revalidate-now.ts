import { sendRevalidationTags } from './revalidate-filled-lib'
sendRevalidationTags({ tags: ['contents:__all__'], dry: false, webUrl: 'https://feelandnote.com', secret: process.env.CRON_SECRET })
  .then(r => { console.log(JSON.stringify(r)); if (r.completedRequests !== r.plannedRequests) process.exitCode = 1 })
