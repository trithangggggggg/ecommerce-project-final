import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3.5 flex flex-col justify-between h-full animate-pulse">
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="w-10 h-4 bg-gray-200 rounded-sm" />
          <div className="w-6 h-6 bg-gray-200 rounded-full" />
        </div>
        <div className="w-full h-40 bg-gray-100 rounded-lg mb-3" />
        <div className="w-full h-4 bg-gray-200 rounded-sm mb-1.5" />
        <div className="w-2/3 h-4 bg-gray-200 rounded-sm mb-3" />
        <div className="w-24 h-3 bg-gray-100 rounded-sm mb-2" />
        <div className="w-28 h-5 bg-gray-200 rounded-sm mb-3" />
      </div>
      <div className="w-full h-8 bg-gray-200 rounded-lg" />
    </div>
  );
};

export default ProductCardSkeleton;
