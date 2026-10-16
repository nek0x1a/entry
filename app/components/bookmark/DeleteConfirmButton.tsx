import { cn } from "cn";
import { Trash } from "lucide-react";

/** 二次确认删除按钮的显示状态和图标尺寸。 */
type DeleteConfirmButtonProps = {
  confirmed: boolean;
  onClick: () => void;
  size?: number;
};

/** 先显示短暂的确认提示，再由调用方执行删除。 */
export default function DeleteConfirmButton({
  confirmed,
  onClick,
  size = 16,
}: DeleteConfirmButtonProps) {
  return (
    <div className="relative flex justify-center">
      {confirmed && (
        <div
          className={cn(
            "absolute bottom-full right-0 z-20",
            "px-2 py-1",
            "bg-destructive rounded border border-destructive-border",
            "text-xs text-foreground whitespace-nowrap",
          )}
        >
          确认删除？
        </div>
      )}

      <button
        type="button"
        className={cn(
          "flex justify-center text-muted-foreground hover:text-destructive-foreground",
          "transform duration-200",
        )}
        aria-label="删除"
        onClick={onClick}
      >
        <Trash size={size} />
      </button>
    </div>
  );
}
