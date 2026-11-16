import { base } from "../lib/store";
export default function VariantIcon({
  id,
  size = 24,
}: {
  id: string;
  size?: number;
}) {
  return (
    <img
      className="variant-picture"
      src={`${base}variants/${id}.svg`}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}
