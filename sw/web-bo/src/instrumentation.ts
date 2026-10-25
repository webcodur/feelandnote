export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { resumeImageProcessingQueue } = await import('./lib/image-processing/queue')
    await resumeImageProcessingQueue()
  }
}
