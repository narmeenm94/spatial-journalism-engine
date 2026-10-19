export interface CameraPose {
  position: number[]
  rotation?: number[]
  quaternion?: number[]
}
export interface CameraStop {
  time: number
  position: number[]
  rotation: number[]
  duration?: number
  easing?: string
}
export function cameraQuaternion(rotation?: number[]): number[]
export function sampleCameraPath(
  keyframes: CameraStop[],
  time: number,
  initial: CameraPose
): { position: number[]; quaternion: number[] }
