import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorStateProps {
  onRetry: () => void | Promise<unknown>;
  title?: string;
  description?: string;
}

export function QueryErrorState({
  onRetry,
  title = "数据加载失败",
  description = "暂时无法读取数据，请检查应用状态后重试。",
}: QueryErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8 text-center sm:flex-row sm:text-left"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => void onRetry()}>
        <RefreshCw className="h-3.5 w-3.5" />
        重试
      </Button>
    </div>
  );
}
