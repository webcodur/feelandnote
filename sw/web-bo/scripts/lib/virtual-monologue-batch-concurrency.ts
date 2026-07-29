const MIN_CONCURRENCY = 1
const MAX_CONCURRENCY = 4

export function parseConcurrency(argv: string[] = process.argv): number {
  const separateIndexes = argv
    .map((value, index) => value === '--concurrency' ? index : -1)
    .filter(index => index >= 0)
  const inlineValues = argv
    .filter(value => value.startsWith('--concurrency='))
    .map(value => value.slice('--concurrency='.length))

  if (separateIndexes.length + inlineValues.length > 1) {
    throw new Error('--concurrency는 한 번만 지정할 수 있다.')
  }
  if (separateIndexes.length + inlineValues.length === 0) {
    return MIN_CONCURRENCY
  }

  const raw = separateIndexes.length
    ? argv[separateIndexes[0] + 1]
    : inlineValues[0]
  if (raw === undefined) {
    throw new Error('--concurrency 값이 필요하다.')
  }

  const concurrency = Number(raw)
  if (
    !Number.isInteger(concurrency)
    || concurrency < MIN_CONCURRENCY
    || concurrency > MAX_CONCURRENCY
  ) {
    throw new Error(
      `--concurrency는 ${MIN_CONCURRENCY}~${MAX_CONCURRENCY} 사이의 정수여야 한다: ${raw}`,
    )
  }
  return concurrency
}

export async function mapSettledWithConcurrency<Input, Output>(
  inputs: readonly Input[],
  concurrency: number,
  task: (input: Input, index: number) => Promise<Output>,
): Promise<PromiseSettledResult<Output>[]> {
  if (
    !Number.isInteger(concurrency)
    || concurrency < MIN_CONCURRENCY
    || concurrency > MAX_CONCURRENCY
  ) {
    throw new Error(
      `concurrency는 ${MIN_CONCURRENCY}~${MAX_CONCURRENCY} 사이의 정수여야 한다: ${concurrency}`,
    )
  }

  const results = new Array<PromiseSettledResult<Output>>(inputs.length)
  let nextIndex = 0

  const worker = async () => {
    while (true) {
      const index = nextIndex
      nextIndex += 1
      if (index >= inputs.length) return

      try {
        results[index] = {
          status: 'fulfilled',
          value: await task(inputs[index], index),
        }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  const workerCount = Math.min(concurrency, inputs.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
