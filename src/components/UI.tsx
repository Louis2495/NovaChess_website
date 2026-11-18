import {
  useEffect,
  Children,
  Fragment,
  useRef,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { X, LoaderCircle, ArrowUpRight } from "lucide-react";
export function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  children,
  label,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      className={`icon-btn ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Card({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={`card ${className}`} {...props}>
      {children}
    </section>
  );
}
export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="title-actions">{children}</div>
    </div>
  );
}
type ChoiceChange = {
  target: { value: string };
  currentTarget: { value: string };
};
export function ChoiceSelect({
  children,
  onChange,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  onChange?: (event: ChoiceChange) => void;
}) {
  const options: { value: string; label: ReactNode; disabled?: boolean }[] = [];
  const text = (nodes: ReactNode): string =>
    Children.toArray(nodes)
      .map((n) =>
        typeof n === "string" || typeof n === "number" ? String(n) : "",
      )
      .join("");
  const collect = (nodes: ReactNode) =>
    Children.forEach(nodes, (node) => {
      if (
        !isValidElement<{
          children?: ReactNode;
          value?: string | number;
          disabled?: boolean;
        }>(node)
      )
        return;
      if (node.type === "option")
        options.push({
          value: String(node.props.value ?? text(node.props.children)),
          label: node.props.children,
          disabled: node.props.disabled,
        });
      else if (node.type === Fragment || node.type === "optgroup")
        collect(node.props.children);
    });
  collect(children);
  if (props.multiple || options.length < 2 || options.length > 3)
    return (
      <select {...props} onChange={onChange}>
        {children}
      </select>
    );
  const selected = String(
    props.value ?? props.defaultValue ?? options[0].value,
  );
  const choose = (value: string) =>
    onChange?.({ target: { value }, currentTarget: { value } });
  return (
    <div
      className={`segmented-control choice-select ${props.className || ""}`}
      role="group"
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      aria-disabled={props.disabled || undefined}
      id={props.id}
      style={props.style}
      title={props.title}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          type="button"
          disabled={props.disabled || option.disabled}
          aria-pressed={selected === option.value}
          onClick={() => choose(option.value)}
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
            e.preventDefault();
            e.stopPropagation();
            const step = e.key === "ArrowRight" ? 1 : -1;
            let next = (index + step + options.length) % options.length;
            while (options[next].disabled && next !== index)
              next = (next + step + options.length) % options.length;
            if (!options[next].disabled) {
              choose(options[next].value);
              e.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("button")
                [next]?.focus();
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const Wrapper =
    isValidElement(children) && children.type === ChoiceSelect
      ? "div"
      : "label";
  return (
    <Wrapper className="field">
      <span>{label}</span>
      {isValidElement(children) &&
      (["input", "select", "textarea"].includes(String(children.type)) ||
        children.type === ChoiceSelect)
        ? cloneElement(children as ReactElement<Record<string, unknown>>, {
            "aria-label":
              (children as ReactElement<Record<string, unknown>>).props[
                "aria-label"
              ] ?? label,
          })
        : children}
    </Wrapper>
  );
}
export function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <label className="toggle-row">
      <span>
        {label}
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, []);
  return (
    <dialog
      className={wide ? "modal wide" : "modal"}
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        if (
          e.target === e.currentTarget &&
          (e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom)
        )
          onClose();
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <IconButton label="Close" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
export function Loading({ error }: { error?: string }) {
  return (
    <div className="empty-state">
      {error ? (
        <>
          <h3>Couldn’t load the library</h3>
          <p>{error}</p>
          <Button onClick={() => location.reload()}>Retry</Button>
        </>
      ) : (
        <>
          <LoaderCircle className="spin" />
          <p>Loading library…</p>
        </>
      )}
    </div>
  );
}
export function Empty({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
  );
}
export function External({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a className="external" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
