import type { ComponentProps } from "react";

/** 展示全局页脚文字 */
export default function Footer({
  footerStr = "猫 ♥ 喵",
  children,
  ...restProps
}: { footerStr?: string } & ComponentProps<"footer">) {
  return (
    <footer {...restProps}>
      <div className="flex justify-center text-sm text-muted-foreground">
        <span>{footerStr}</span>
      </div>
      {children}
    </footer>
  );
}
