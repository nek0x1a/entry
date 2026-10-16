import { cn } from "cn";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import type { ToastMessage } from "./ToastProvider";

/** 单条通知组件的内容及关闭回调。 */
type ToastItemProps = {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
};

/** 各通知类别对应的图标、文案和语义颜色。 */
const VARIANT_CONTENT = {
  success: {
    Icon: CheckCircle2,
    label: "成功",
    textClassName: "text-success-foreground",
    bgClassName: "bg-success",
    borderClassName: "border-success-border",
  },
  error: {
    Icon: CircleAlert,
    label: "错误",
    textClassName: "text-destructive-foreground",
    bgClassName: "bg-destructive",
    borderClassName: "border-destructive-border",
  },
  info: {
    Icon: Info,
    label: "提示",
    textClassName: "text-info-foreground",
    bgClassName: "bg-info",
    borderClassName: "border-info-border",
  },
} as const;

/** 呈现通知内容、无障碍状态和手动关闭按钮。 */
export default function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { Icon, label, textClassName, bgClassName, borderClassName } =
    VARIANT_CONTENT[toast.variant];

  return (
    <div
      className={cn(
        "min-h-0 p-3",
        bgClassName,
        "overflow-hidden wrap-break-word  pointer-events-auto",
        "rounded border",
        borderClassName,
        "shadow shadow-black/20",
        toast.exiting ? "toast-exit pointer-events-none" : "toast-enter"
      )}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <div className="mb-2 flex gap-2 items-center">
        <Icon
          className={`flex-none shrink-0 ${textClassName}`}
          aria-hidden="true"
          size={20}
        />
        <span className={`flex-none font-semibold ${textClassName}`}>{label}</span>
        <button
          type="button"
          className="flex ml-auto cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-surface-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="关闭通知"
          onClick={() => onDismiss(toast.id)}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <span className="min-w-0 text-sm leading-[1.4]">{toast.message}</span>

    </div>
  );
}
