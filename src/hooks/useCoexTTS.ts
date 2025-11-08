import { useCallback, useMemo, useRef, useState } from 'react';

import { requestTTS, AudioManager } from '@/lib/ttsUtils';
import { splitTextIntoSegments } from '@/lib/textSplitter';

type PlaybackStarter = () => Promise<void>;

const recommendationKeywords = [
  '제안',
  '추천',
  '어떠실까요',
  '어떠세요',
  '어떨까요',
  '해보세요',
  '해보시는건어때요',
  '가보세요',
  '가보시는걸추천',
  '즐겨보세요',
  '권해드려요',
];

const TTS_TIMEOUT_MS = 12_000;

const withTimeout = async <T,>(
  executor: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await executor(controller.signal);
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'AbortError' || error.message === 'The user aborted a request.')
    ) {
      throw new Error('tts-timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const getFirstSentence = (text: string) => {
  const match = text.match(/[^.!?]*(?:[.!?]|$)/);
  return match ? match[0].trim() : text.split(/[.!?]/)[0]?.trim();
};

const getLastSentence = (text: string) => {
  const matches = text.match(/[^.!?]+[.!?]?/g);
  if (!matches || matches.length === 0) {
    return text.trim();
  }
  return matches[matches.length - 1].trim();
};

const isRecommendationSentence = (sentence: string) => {
  if (!sentence) return false;
  const normalized = sentence.replace(/\s+/g, '');
  return recommendationKeywords.some((keyword) => normalized.includes(keyword));
};

const buildSnippet = (rawText: string) => {
  if (!rawText) return '';

  const trimmed = rawText.trim();
  if (!trimmed) return '';

  const segments = splitTextIntoSegments(trimmed);
  const firstSegmentText = segments[0]?.text ?? trimmed;
  const lastSegmentText = segments[segments.length - 1]?.text ?? firstSegmentText;

  const firstSentence = getFirstSentence(firstSegmentText);
  const lastSentence = getLastSentence(lastSegmentText);

  const sentences: string[] = [];

  if (firstSentence) {
    sentences.push(firstSentence);
  }

  if (lastSentence && lastSentence !== firstSentence && isRecommendationSentence(lastSentence)) {
    sentences.push(lastSentence);
  }

  const snippet = sentences.join(' ').trim();
  return snippet || firstSegmentText;
};

const prepareSnippetSource = (text: string, useSnippet: boolean) => {
  if (!useSnippet) {
    return text;
  }
  return buildSnippet(text);
};

export default function useCoexTTS() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioManager = useMemo(() => new AudioManager(audioRef), []);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  const stopCurrentPlayback = useCallback(() => {
    if (audioManager.getIsPlaying()) {
      audioManager.stopAudio();
    }
    setIsPlayingTTS(false);
  }, [audioManager]);

  const preparePlayback = useCallback(
    async (text: string, useSnippet: boolean): Promise<PlaybackStarter | null> => {
      const sourceText = prepareSnippetSource(text, useSnippet);
      if (!sourceText) {
        return null;
      }

      try {
        const audioBlob = await withTimeout(
          (signal) => requestTTS(sourceText, { signal }),
          TTS_TIMEOUT_MS,
        );

        return async () => {
          stopCurrentPlayback();
          setIsPlayingTTS(true);
          try {
            await audioManager.playAudio(audioBlob, {
              onEnded: () => setIsPlayingTTS(false),
              onError: () => setIsPlayingTTS(false),
            });
          } catch (error) {
            setIsPlayingTTS(false);
            throw error;
          }
        };
      } catch (error) {
        console.error('TTS preparation failed:', error);
        return null;
      }
    },
    [audioManager, stopCurrentPlayback],
  );

  const prepareAuto = useCallback(
    async (text: string) => preparePlayback(text, true),
    [preparePlayback],
  );

  const playFull = useCallback(
    async (text: string) => {
      const starter = await preparePlayback(text, false);
      if (starter) {
        try {
          await starter();
        } catch (error) {
          console.error('TTS playback failed:', error);
        }
      }
    },
    [preparePlayback],
  );

  return {
    isPlayingTTS,
    playFull,
    prepareAuto,
    stopCurrentPlayback,
  };
}


