import ToastItem from "./ToastItem";
import type { ToastMessage } from "./ToastProvider";

/** 通知视口接收的通知列表和关闭操作。 */
type ToastViewportProps = {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
};

/** 将通知按队列顺序固定显示在页面右上方。 */
export default function ToastViewport({
  toasts,
  onDismiss,
}: ToastViewportProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-1000 flex w-[calc(100vw-2rem)] max-w-sm flex-col items-stretch">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`grid min-h-0 grid-rows-[1fr] overflow-hidden pb-2.5 transition-[grid-template-rows,padding-bottom] duration-240 ease-in-out motion-reduce:transition-none ${toast.exiting ? "grid-rows-[0fr] pb-0" : ""}`}
        >
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
