export function atMostOnceAFrame<F extends Function>(fn: F) {
  let frameRequest: number | null = null
  function ret(...args: any[]) {
    if (frameRequest == null) {
      frameRequest = requestAnimationFrame(function () {
        fn(...args)
        frameRequest = null
      })
    }
  }
  return ret as any as F
}

export function lastOf<T>(ts: T[]): T | null {
  return ts[ts.length-1] || null
}

export function getOrInsert<K, V>(map: Map<K, V>, k: K, fallback: (k?: K) => V): V {
  if (!map.has(k)) map.set(k, fallback(k))
  return map.get(k)!
}

export function getOrElse<K, V>(map: Map<K, V>, k: K, fallback: (k?: K) => V): V {
  if (!map.has(k)) return fallback(k)
  return map.get(k)!
}

export function* itMap<T, U>(it: Iterable<T>, f: (t: T) => U): Iterable<U> {
  for (let t of it) {
    yield f(t)
  }
}

export function itForEach<T>(it: Iterable<T>, f: (t: T) => void): void {
  for (let t of it) { f(t) }
}

export function itReduce<T, U>(it: Iterable<T>, f: (a: U, b: T) => U, init: U): U {
  let accum: U = init
  for (let t of it) {
    accum = f(accum, t)
  }
  return accum
}

// NOTE: This blindly assumes the same result across contexts.
const measureTextCache = new Map<string, number>()
export function cachedMeasureTextWidth(ctx: CanvasRenderingContext2D, text: string): number {
  if (!measureTextCache.has(text)) {
    measureTextCache.set(text, ctx.measureText(text).width)
  }
  return measureTextCache.get(text)!
}