import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Task } from "@/types/entities";

const loadTaskEditDialog = () => import("./TaskEditDialog");
const TaskEditDialog = lazy(() =>
  loadTaskEditDialog().then(({ TaskEditDialog }) => ({ default: TaskEditDialog }))
);

interface TaskDialogValue {
  /** 打开新建任务弹窗，可预填项目 */
  openCreate: (presetProjectId?: number) => void;
  /** 打开编辑任务弹窗 */
  openEdit: (task: Task) => void;
}

// 默认 noop：允许组件在 Provider 外渲染（如单测）而不崩溃
const TaskDialogContext = createContext<TaskDialogValue>({
  openCreate: () => {},
  openEdit: () => {},
});

export function useTaskDialog() {
  return useContext(TaskDialogContext);
}

/**
 * 全局任务弹窗 Provider：统一管理新建/编辑任务入口，
 * 供快捷键（n）和各页面 onEdit 调用。
 */
export function TaskDialogProvider({ children }: { children: ReactNode }) {
  const [task, setTask] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);
  const [presetProjectId, setPresetProjectId] = useState<number | undefined>();

  const openCreate = useCallback((pid?: number) => {
    void loadTaskEditDialog();
    setTask(null);
    setPresetProjectId(pid);
    setOpen(true);
  }, []);

  const openEdit = useCallback((t: Task) => {
    void loadTaskEditDialog();
    setTask(t);
    setPresetProjectId(undefined);
    setOpen(true);
  }, []);

  return (
    <TaskDialogContext.Provider value={{ openCreate, openEdit }}>
      {children}
      {open && (
        <Suspense fallback={null}>
          <TaskEditDialog
            task={task}
            presetProjectId={presetProjectId}
            open={open}
            onOpenChange={setOpen}
          />
        </Suspense>
      )}
    </TaskDialogContext.Provider>
  );
}
