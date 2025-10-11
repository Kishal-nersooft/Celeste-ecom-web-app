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
const PriceView = ({ price, label, className, originalPrice, discountPercentage, isDiscounted }: Props) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        {isDiscounted ? (
          <>
            <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              <PriceFormatter 
                amount={price} 
                className="text-white font-semibold text-sm"
              />
            </div>
            {originalPrice && (
              <PriceFormatter 
                amount={originalPrice} 
                className={twMerge("line-through text-gray-400 text-xs", className)} 
              />
            )}
          </>
        ) : (
          <PriceFormatter 
            amount={price} 
            className={twMerge("text-sm font-bold", className)} 
          />
        )}
      </div>
      {label && (<p className="text-white text-xs">{label}</p>)}
    </div>
  );
};

export default PriceView;
