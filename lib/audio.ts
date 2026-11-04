/**
 * Client-Side Audio Management for Bol
 * MediaRecorder, Speech Synthesis, Live Waveform Analysis & Report Exporter
 * Converts recordings to 16kHz mono WAV for Gnani Prisma STT compliance.
 */

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private volumeInterval: number | null = null;

  async start(onVolume?: (volume: number) => void): Promise<void> {
    this.audioChunks = [];
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('BROWSER_UNSUPPORTED');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Setup audio analysis for live visual mic feedback
      if (onVolume) {
        try {
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtxClass) {
            this.audioContext = new AudioCtxClass();
            const source = this.audioContext.createMediaStreamSource(this.stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);

            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.volumeInterval = window.setInterval(() => {
              if (this.analyser) {
                this.analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const avg = sum / dataArray.length;
                const normalized = Math.min(1, Math.max(0, avg / 128));
                onVolume(normalized);
              }
            }, 60);
          }
        } catch (e) {
          console.warn('[VoiceRecorder] Live visualizer initialization skipped:', e);
        }
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100);
    } catch (err: any) {
      this.cleanupAnalysis();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('PERMISSION_DENIED');
      }
      throw err;
    }
  }

  stop(): Promise<{ blob: Blob; base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      this.cleanupAnalysis();

      if (!this.mediaRecorder) {
        return reject(new Error('Recorder not initialized'));
      }

      this.mediaRecorder.onstop = async () => {
        const rawMimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const rawBlob = new Blob(this.audioChunks, { type: rawMimeType });

        // Stop all audio tracks to free up the microphone
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        try {
          // Convert to 16kHz mono WAV for Gnani Prisma STT compliance
          const wavResult = await blobTo16kHzWav(rawBlob);
          resolve(wavResult);
        } catch (err) {
          console.warn('[VoiceRecorder] WAV conversion failed, using raw audio:', err);
          const base64 = await blobToBase64(rawBlob);
          resolve({ blob: rawBlob, base64, mimeType: rawMimeType });
        }
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    });
  }

  cancel(): void {
    this.cleanupAnalysis();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  private cleanupAnalysis(): void {
    if (this.volumeInterval !== null) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.analyser = null;
  }
}

/**
 * Converts recorded browser audio to 16kHz 16-bit mono PCM WAV
 */
async function blobTo16kHzWav(blob: Blob): Promise<{ blob: Blob; base64: string; mimeType: string }> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('AudioContext not supported');
  }

  const audioCtx = new AudioContextClass();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(audioBuffer.duration * targetSampleRate)),
    targetSampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();
  await audioCtx.close();

  const pcmData = rendered.getChannelData(0);
  const wavBuffer = encodeWAV(pcmData, targetSampleRate);
  const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });

  const base64 = await blobToBase64(wavBlob);
  return { blob: wavBlob, base64, mimeType: 'audio/wav' };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = (reader.result as string) || '';
      resolve(res.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return buffer;
}

let activeAudio: HTMLAudioElement | null = null;

export function stopAnyPlayingAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function playTutorVoice(
  text: string,
  audioBase64?: string,
  rate: number = 0.95,
  onEnd?: () => void,
  langCode: string = 'en-IN'
): void {
  stopAnyPlayingAudio();

  // If binary audio from backend is available
  if (audioBase64) {
    try {
      const mime = audioBase64.startsWith('UklGR') ? 'audio/wav' : 'audio/mpeg';
      const audio = new Audio(`data:${mime};base64,${audioBase64}`);
      audio.playbackRate = rate;
      activeAudio = audio;
      audio.onended = () => {
        activeAudio = null;
        if (onEnd) onEnd();
      };
      audio.onerror = () => {
        fallbackWebSpeech(text, rate, onEnd, langCode);
      };
      audio.play().catch(() => {
        fallbackWebSpeech(text, rate, onEnd, langCode);
      });
      return;
    } catch {
      // Fallback to Web Speech API
    }
  }

  fallbackWebSpeech(text, rate, onEnd, langCode);
}

function fallbackWebSpeech(
  text: string,
  rate: number = 0.95,
  onEnd?: () => void,
  langCode: string = 'en-IN'
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  // Clean prompt text for speech
  const clean = text.replace(/["“”*]/g, '');
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = rate;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const isTamil = langCode.includes('ta') || /[\u0B80-\u0BFF]/.test(clean);

  if (isTamil) {
    utterance.lang = 'ta-IN';
    const tamilVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes('ta') ||
        v.name.toLowerCase().includes('tamil')
    );
    if (tamilVoice) {
      utterance.voice = tamilVoice;
    }
  } else {
    utterance.lang = 'en-IN';
    const indianVoice = voices.find(
      (v) =>
        v.lang.includes('IN') ||
        v.name.toLowerCase().includes('india') ||
        v.name.toLowerCase().includes('priya') ||
        v.name.toLowerCase().includes('heera')
    );
    if (indianVoice) {
      utterance.voice = indianVoice;
    }
  }

  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Helper to download structured report file as Markdown (.md)
 */
export function downloadReportFile(content: string, filename: string = 'Bol_Speaking_Report.md') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
