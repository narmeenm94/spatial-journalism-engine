export class TestFileReader {
  result = null
  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
      .then((result) => {
        this.result = result
        this.onload?.()
        this.onloadend?.()
      })
      .catch((e) => this.onerror?.(e))
  }
  readAsDataURL(blob) {
    blob
      .arrayBuffer()
      .then((result) => {
        this.result =
          'data:' +
          blob.type +
          ';base64,' +
          Buffer.from(result).toString('base64')
        this.onload?.()
        this.onloadend?.()
      })
      .catch((e) => this.onerror?.(e))
  }
}
