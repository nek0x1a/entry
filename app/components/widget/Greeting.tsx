import { type ComponentProps, useEffect, useState } from "react";

/** 返回当前时间，并在每秒边界更新以保持时钟准确。 */
function useCurrentSecond() {
  const [date, setDate] = useState<Date | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = new Date();
      setDate(now);

      const delay = 1000 - now.getMilliseconds();
      timer = setTimeout(tick, delay);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return date;
}

/** 显示本地日期、星期、时间和入口站问候语。 */
export default function Greeting({
  helloStr = "喵 >w< ~",
  children,
  ...restProps
}: { helloStr?: string } & ComponentProps<"div">) {
  const currentDate = useCurrentSecond();
  return (
    <div {...restProps}>
      {currentDate && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            {/* 日期 */}
            <span className="text-2xl flex-none">
              {currentDate.toLocaleDateString()}
            </span>
            {/* 星期 */}
            <span className="flex-none">
              <span className="text-2xl">星期</span>
              <span className="text-primary-foreground text-2xl font-bold">
                {
                  ["天", "一", "二", "三", "四", "五", "六"][
                    currentDate.getDay()
                  ]
                }
              </span>
            </span>

            {/* 时间 */}
            <span className="flex-none text-primary-foreground text-2xl font-bold">
              {currentDate.toLocaleTimeString()}
            </span>
          </div>

          {/* 问候语 */}
          <div className="flex-none whitespace-nowrap text-6xl font-bold">
            {helloStr}
          </div>
        </div>
      )}
    </div>
  );
}
