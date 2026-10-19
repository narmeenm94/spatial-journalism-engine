export function createButtonVisual(THREE: any, config: any, options: { language?: string; resolve?: (path: string) => string; loadModel?: (url: string) => Promise<any>; onError?: (error: Error) => void }): { group: any; ready: Promise<void>; dispose: () => void }
export function disposeButtonVisual(group: any): void
