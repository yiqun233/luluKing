import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  showFeedback,
  subscribeFeedback,
  type FeedbackMessage,
} from "@/components/feedback/feedback";

const DISMISS_DELAY = 5000;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);

  useEffect(
    () =>
      subscribeFeedback((message) => {
        setMessages((current) => [...current.slice(-3), message]);
        window.setTimeout(() => {
          setMessages((current) =>
            current.filter((item) => item.id !== message.id)
          );
        }, DISMISS_DELAY);
      }),
    []
  );

  const dismiss = (id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  };

  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        aria-label="操作提示"
      >
        {messages.map((message) => {
          const isError = message.tone === "error";
          return (
            <div
              key={message.id}
              role={isError ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-lg ${
                isError
                  ? "border-destructive/30 bg-background text-destructive"
                  : "border-green-500/30 bg-background text-green-700 dark:text-green-400"
              }`}
            >
              {isError ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span className="flex-1">{message.message}</span>
              <button
                type="button"
                onClick={() => dismiss(message.id)}
                className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="关闭提示"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export const feedback = {
  success: (message: string) => showFeedback("success", message),
  error: (message: string) => showFeedback("error", message),
};
