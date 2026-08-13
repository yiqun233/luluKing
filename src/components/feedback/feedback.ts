export type FeedbackTone = "success" | "error";

export interface FeedbackMessage {
  id: string;
  tone: FeedbackTone;
  message: string;
}

type FeedbackListener = (message: FeedbackMessage) => void;

const listeners = new Set<FeedbackListener>();
const lastShownAt = new Map<string, number>();
let sequence = 0;

export function showFeedback(tone: FeedbackTone, message: string) {
  const now = Date.now();
  const signature = `${tone}:${message}`;
  const lastTime = lastShownAt.get(signature);

  if (lastTime && now - lastTime < 1500) return;

  lastShownAt.set(signature, now);
  const feedback: FeedbackMessage = {
    id: `${now}-${sequence++}`,
    tone,
    message,
  };

  listeners.forEach((listener) => listener(feedback));
}

export function subscribeFeedback(listener: FeedbackListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
