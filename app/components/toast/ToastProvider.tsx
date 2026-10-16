import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ToastViewport from "./ToastViewport";
import "./toast-animation.css";

/** 通知的语义类别及对应的视觉样式。 */
export type ToastVariant = "success" | "error" | "info";

/** 通知视图模型，exiting 用于播放离场动画。 */
export type ToastMessage = {
  id: number;
  message: string;
  variant: ToastVariant;
  exiting: boolean;
};

/** 单次通知的可选显示时长。 */
export type ToastOptions = {
  duration?: number;
};

/** Toast Provider 暴露给后代组件的通知方法。 */
export type ToastApi = {
  show: (message: string, variant?: ToastVariant, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
};

/** 全局通知 API 上下文；未挂载 Provider 时为 null。 */
export const ToastContext = createContext<ToastApi | null>(null);
const DEFAULT_DURATION = 3000;
const EXIT_DURATION = 240;

/** 一条通知的自动关闭和离场清理定时器。 */
type ToastTimer = {
  dismiss: ReturnType<typeof setTimeout>;
  remove?: ReturnType<typeof setTimeout>;
};

/** 管理通知队列、定时器生命周期，并将通知视口挂载到应用末尾。 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map<number, ToastTimer>());

  const dismiss = useCallback((id: number) => {
    const timers = timersRef.current.get(id);
    if (!timers || timers.remove !== undefined) {
      return;
    }

    clearTimeout(timers.dismiss);
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, exiting: true } : toast,
      ),
    );

    timers.remove = setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timersRef.current.delete(id);
    }, EXIT_DURATION);
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, variant = "info", options) => {
      const id = nextIdRef.current++;
      const duration = Math.max(0, options?.duration ?? DEFAULT_DURATION);
      const dismissTimer = setTimeout(() => dismiss(id), duration);

      timersRef.current.set(id, { dismiss: dismissTimer });
      setToasts((current) => [
        ...current,
        { id, message, variant, exiting: false },
      ]);
    },
    [dismiss],
  );

  const success = useCallback<ToastApi["success"]>(
    (message, options) => show(message, "success", options),
    [show],
  );
  const error = useCallback<ToastApi["error"]>(
    (message, options) => show(message, "error", options),
    [show],
  );
  const info = useCallback<ToastApi["info"]>(
    (message, options) => show(message, "info", options),
    [show],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer.dismiss);
        if (timer.remove !== undefined) {
          clearTimeout(timer.remove);
        }
      }
      timers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ show, success, error, info }),
    [show, success, error, info],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

