import { useContext } from "react";
import { ToastContext, type ToastApi } from "./ToastProvider";

/** 获取全局通知方法；必须在 ToastProvider 后代中调用。 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast 必须在 ToastProvider 内使用");
  }
  return context;
}
