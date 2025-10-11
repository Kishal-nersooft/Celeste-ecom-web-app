"use client";

import React, { useState } from "react";

export default function TestDiscountLogic() {
  const [testResults, setTestResults] = useState<any[]>([]);

  const testDiscountLogic = () => {
    const testCases = [
      // Test case 1: Product with discount
      {
        name: "Product with discount",
        product: {
          id: 1,
          name: "Test Product 1",
          pricing: {
            base_price: 100,
            final_price: 80,
            discount_applied: 20,
            discount_percentage: 20,
            applied_price_lists: ["summer_sale"]
          }
        },
        expected: true
      },
      // Test case 2: Product without discount
      {
        name: "Product without discount",
        product: {
          id: 2,
          name: "Test Product 2",
          pricing: {
            base_price: 100,
            final_price: 100,
            discount_applied: 0,
            discount_percentage: 0,
            applied_price_lists: []
          }
        },
        expected: false
      },
      // Test case 3: Product with null discount_applied
      {
        name: "Product with null discount_applied",
        product: {
          id: 3,
          name: "Test Product 3",
          pricing: {
            base_price: 100,
            final_price: 100,
            discount_applied: null,
            discount_percentage: 0,
            applied_price_lists: []
          }
        },
        expected: false
      },
      // Test case 4: Product with undefined discount_applied
      {
        name: "Product with undefined discount_applied",
        product: {
          id: 4,
          name: "Test Product 4",
          pricing: {
            base_price: 100,
            final_price: 100,
            discount_applied: undefined,
            discount_percentage: 0,
            applied_price_lists: []
          }
        },
        expected: false
      },
      // Test case 5: Product with no pricing data
      {
        name: "Product with no pricing data",
        product: {
          id: 5,
          name: "Test Product 5",
          pricing: null
        },
        expected: false
      },
      // Test case 6: Product with negative discount (edge case)
      {
        name: "Product with negative discount",
        product: {
          id: 6,
          name: "Test Product 6",
          pricing: {
            base_price: 100,
            final_price: 100,
            discount_applied: -10,
            discount_percentage: 0,
            applied_price_lists: []
          }
        },
        expected: false
      }
    ];

    const results = testCases.map(testCase => {
      // Apply the same logic as ProductCard component
      const isDiscounted = testCase.product.pricing && 
                          testCase.product.pricing.discount_applied !== null && 
                          testCase.product.pricing.discount_applied !== undefined && 
                          testCase.product.pricing.discount_applied > 0;
      
      const passed = isDiscounted === testCase.expected;
      
      return {
        ...testCase,
        actual: isDiscounted,
        passed,
        discountApplied: testCase.product.pricing?.discount_applied
      };
    });

    setTestResults(results);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Testing Discount Logic</h1>
      
      <button
        onClick={testDiscountLogic}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-6"
      >
        Test Discount Detection Logic
      </button>

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          {testResults.map((result, index) => (
            <div key={index} className={`border rounded p-4 ${
              result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">
                  {result.name} {result.passed ? '✅' : '❌'}
                </h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                <p><strong>Product ID:</strong> {result.product.id}</p>
                <p><strong>Product Name:</strong> {result.product.name}</p>
                <p><strong>Discount Applied:</strong> {result.discountApplied}</p>
                <p><strong>Expected:</strong> {result.expected ? 'Discounted (Black BG)' : 'Regular (Gray BG)'}</p>
                <p><strong>Actual:</strong> {result.actual ? 'Discounted (Black BG)' : 'Regular (Gray BG)'}</p>
              </div>
              
              {result.product.pricing && (
                <div className="text-xs bg-gray-100 p-2 rounded">
                  <strong>Pricing Data:</strong>
                  <pre>{JSON.stringify(result.product.pricing, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
          
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Summary</h4>
            <p className="text-sm text-blue-700">
              <strong>Passed:</strong> {testResults.filter(r => r.passed).length} / {testResults.length} tests
            </p>
            <p className="text-sm text-blue-700">
              <strong>Success Rate:</strong> {Math.round((testResults.filter(r => r.passed).length / testResults.length) * 100)}%
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded p-4">
        <h4 className="font-semibold text-yellow-800 mb-2">Discount Detection Logic:</h4>
        <pre className="text-sm text-yellow-700 bg-yellow-100 p-2 rounded">
{`const isDiscounted = product.pricing && 
                    product.pricing.discount_applied !== null && 
                    product.pricing.discount_applied !== undefined && 
                    product.pricing.discount_applied > 0;`}
        </pre>
        <p className="text-sm text-yellow-700 mt-2">
          This logic ensures that only products with a positive discount_applied value get the black background.
        </p>
      </div>
    </div>
  );
}
