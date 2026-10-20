import { twMerge } from "tailwind-merge";
import PriceFormatter from "./PriceFormatter";

interface Props {
  price: number | undefined;
  className?: string;
  label?: string;
  originalPrice?: number;
  discountPercentage?: number;
  isDiscounted?: boolean;
}
const PriceView = ({ price, label, className, originalPrice, discountPercentage, isDiscounted, compact = false }: Props & { compact?: boolean }) => {
  return (
    <div className="flex items-center justify-between gap-1">
      <div className={twMerge("flex min-w-0 items-center", compact ? "gap-1 sm:gap-1.5" : "gap-1.5")}>
        {isDiscounted ? (
          <>
            <div className={twMerge("bg-red-500 text-white font-bold rounded-md", compact ? "px-1 py-0.5 text-[9px] sm:px-1.5 sm:text-[10px]" : "px-1.5 py-0.5 text-[10px]")}>
              <PriceFormatter 
                amount={price} 
                className={twMerge("text-white font-semibold", compact ? "text-[10px] sm:text-sm" : "text-sm")}
              />
            </div>
            {originalPrice && (
              <PriceFormatter 
                amount={originalPrice} 
                className={twMerge("line-through text-gray-400", compact ? "text-[9px] sm:text-xs" : "text-xs", className)} 
              />
            )}
          </>
        ) : (
          <PriceFormatter 
            amount={price} 
            className={twMerge("font-bold text-black", compact ? "text-[11px] sm:text-sm" : "text-sm", className)} 
          />
        )}
      </div>
      {label && (<p className="text-white text-xs">{label}</p>)}
    </div>
  );
};

export default PriceView;
