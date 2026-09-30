// Runs only after an explicit local-app capture request. No output audio.
class JarvisCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buffer = new Float32Array(256); this.used = 0; this.count = 0; }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (input) for (const value of input) {
      if (this.count++ >= sampleRate * 30) return false;
      this.buffer[this.used++] = value;
      if (this.used === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(256); this.used = 0;
      }
    }
    return true;
  }
}
registerProcessor('jarvis-capture', JarvisCapture);
