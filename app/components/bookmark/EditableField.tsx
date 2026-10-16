import { cn } from "cn";
import { useCallback, useRef, useState } from "react";
import type { ParseResult } from "~/utils/bookmarkValidation";

/** 可双击编辑的文本字段及其规范化、校验回调。 */
type EditableFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
  normalize?: (value: string) => ParseResult<string>;
  multiline?: boolean;
  placeholder?: string;
  validate?: (value: string) => string | null;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
};

/** 将未知解析异常转换为可展示的文本。 */
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "字段校验失败";
}

/** 支持单行或自动增高多行编辑，并在失焦时提交校验。 */
export default function EditableField({
  value,
  onChange,
  onError,
  normalize,
  multiline = false,
  placeholder = "",
  validate,
  className,
  inputClassName,
  displayClassName,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const resizeTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  function focusEditor() {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      if (inputRef.current instanceof HTMLTextAreaElement) {
        resizeTextarea();
      }
    });
  }

  function startEditing() {
    setDraft(value);
    setEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      resizeTextarea();
    });
  }

  function reportInvalid(message: string) {
    onError(message);
    // blur 触发的提交失败后，保持编辑态并将焦点交还给输入框。
    focusEditor();
  }

  function commit() {
    let normalizedValue: string;
    try {
      const result = normalize
        ? normalize(draft)
        : ({ ok: true, value: draft } satisfies ParseResult<string>);

      if (!result.ok) {
        reportInvalid(result.error);
        return;
      }

      normalizedValue = result.value;
      const validationError = validate?.(normalizedValue) ?? null;
      if (validationError) {
        reportInvalid(validationError);
        return;
      }
    } catch (error) {
      // 解析器意外抛错时也通过统一通知出口反馈，避免失焦提交造成未处理异常。
      reportInvalid(getErrorMessage(error));
      return;
    }

    onChange(normalizedValue);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div
        className={cn("relative min-w-0", className)}
        onDoubleClick={startEditing}
      >
        <div className={cn("break-all", displayClassName)}>
          {value || <span className="italic">{placeholder}</span>}
        </div>
      </div>
    );
  }

  const fieldClassName = cn(
    "block w-full min-w-0 border border-muted-border bg-transparent",
    "px-1 py-0.5 outline-none focus:border-foreground",
    multiline && "resize-none overflow-hidden",
    inputClassName,
  );

  const setInputRef = (
    element: HTMLInputElement | HTMLTextAreaElement | null,
  ) => {
    inputRef.current = element;
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      {multiline ? (
        <textarea
          ref={setInputRef}
          className={fieldClassName}
          rows={1}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            resizeTextarea();
          }}
          onBlur={commit}
        />
      ) : (
        <input
          ref={setInputRef}
          className={fieldClassName}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
        />
      )}
    </div>
  );
}
