import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { FeedbackProvider } from "@/components/feedback/FeedbackProvider";
import { feedback } from "@/components/feedback/FeedbackProvider";
import "./styles/globals.css";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: () => feedback.error("数据加载失败，请稍后重试。"),
  }),
  mutationCache: new MutationCache({
    onError: () => feedback.error("操作失败，数据未被修改，请稍后重试。"),
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
