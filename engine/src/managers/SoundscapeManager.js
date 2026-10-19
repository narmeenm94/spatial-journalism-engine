/** Persistent room ambience and sounds attached to inspectable objects. */
export class SoundscapeManager {
  constructor(audio, parent, resolve) { this.audio = audio; this.parent = parent; this.resolve = resolve; this.entries = new Map() }
  async load(configs = []) {
    for (const config of configs) {
      const id = 'soundscape:' + config.id
      const sound = await this.audio.loadAudio(id, { ...config, url: this.resolve(config.file), positional: config.positional !== false })
      if (config.positional !== false) this.parent.add(sound)
      this.entries.set(id, { config, active: !config.objectId && config.autoplay !== false, started: false, finished: false })
    }
  }
  toggleObject(objectId, active) {
    for (const [id, entry] of this.entries) if (entry.config.objectId === objectId) {
      entry.active = active
      entry.finished = false
      entry.started = false
      this.audio.stop(id)
    }
  }
  update(paused) {
    for (const [id, entry] of this.entries) {
      if (!entry.active || paused) {
        if (this.audio.isPlaying(id)) this.audio.pause(id)
      } else if (!entry.finished && !this.audio.isPlaying(id)) {
        const sound = this.audio.sounds.get(id)
        if (entry.started && !entry.config.loop && this.audio.getCurrentTime(id) >= (sound?.buffer?.duration || Infinity)) entry.finished = true
        else { this.audio.play(id); entry.started = true }
      }
    }
  }
  dispose() { for (const id of this.entries.keys()) this.audio.removeAudio(id); this.entries.clear() }
}
