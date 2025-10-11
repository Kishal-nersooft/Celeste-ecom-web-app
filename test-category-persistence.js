// Test script to verify category persistence across navigation
// Run this in the browser console to test the category state management

console.log('🧪 Testing Category Persistence...');

// Test function to check category state
function testCategoryState() {
  console.log('\n📦 Category State Test');
  
  if (typeof window !== 'undefined' && window.localStorage) {
    const categoryState = localStorage.getItem('category-state');
    if (categoryState) {
      try {
        const parsed = JSON.parse(categoryState);
        console.log('✅ Category state found:', parsed);
        
        // Check if we have a last visited category
        if (parsed.lastVisitedCategory !== null) {
          console.log(`📍 Last visited category: ${parsed.lastVisitedCategory} (isDeals: ${parsed.lastVisitedIsDeals})`);
        } else {
          console.log('📍 No last visited category');
        }
        
        // Check current selection
        if (parsed.selectedCategoryId !== null) {
          console.log(`🎯 Currently selected category: ${parsed.selectedCategoryId} (isDeals: ${parsed.isDealsSelected})`);
        } else {
          console.log('🎯 No category currently selected');
        }
      } catch (error) {
        console.error('❌ Error parsing category state:', error);
      }
    } else {
      console.log('⚠️ No category state found in localStorage');
    }
  } else {
    console.log('⚠️ localStorage not available');
  }
}

// Test function to simulate category selection
function testCategorySelection() {
  console.log('\n🎯 Category Selection Test');
  
  if (typeof window !== 'undefined') {
    // Check if category context is available
    if (window.React && window.React.useContext) {
      console.log('✅ React context available');
    } else {
      console.log('⚠️ React context not available in this scope');
    }
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    const dealsParam = urlParams.get('deals');
    
    console.log('🔗 URL Parameters:');
    console.log(`   category: ${categoryParam || 'none'}`);
    console.log(`   deals: ${dealsParam || 'none'}`);
  }
}

// Test function to simulate navigation flow
function testNavigationFlow() {
  console.log('\n🧭 Navigation Flow Test');
  
  console.log('📝 Test Steps:');
  console.log('1. Go to homepage');
  console.log('2. Click on a category (e.g., Beverage)');
  console.log('3. Click on a product');
  console.log('4. Click the back button');
  console.log('5. Verify you return to the same category');
  
  console.log('\n💡 Expected Behavior:');
  console.log('- Category state should be saved when clicking a product');
  console.log('- Back button should restore the last visited category');
  console.log('- URL should include category parameter');
  console.log('- Category should remain selected after navigation');
}

// Test function to clear category state
function clearCategoryState() {
  console.log('\n🧹 Clearing Category State');
  
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('category-state');
    console.log('✅ Category state cleared');
    
    // Also clear URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('category');
    url.searchParams.delete('deals');
    window.history.replaceState({}, '', url.toString());
    console.log('✅ URL parameters cleared');
  }
}

// Test function to simulate category selection
function simulateCategorySelection(categoryId, isDeals = false) {
  console.log(`\n🎯 Simulating category selection: ${categoryId} (deals: ${isDeals})`);
  
  if (typeof window !== 'undefined') {
    // Update URL parameters
    const url = new URL(window.location.href);
    if (isDeals) {
      url.searchParams.set('deals', 'true');
      url.searchParams.delete('category');
    } else if (categoryId) {
      url.searchParams.set('category', categoryId.toString());
      url.searchParams.delete('deals');
    } else {
      url.searchParams.delete('category');
      url.searchParams.delete('deals');
    }
    
    window.history.replaceState({}, '', url.toString());
    console.log('✅ URL updated:', url.toString());
    
    // Simulate localStorage update
    const categoryState = {
      selectedCategoryId: categoryId,
      isDealsSelected: isDeals,
      lastVisitedCategory: categoryId,
      lastVisitedIsDeals: isDeals
    };
    
    localStorage.setItem('category-state', JSON.stringify(categoryState));
    console.log('✅ Category state updated:', categoryState);
  }
}

// Export test functions
if (typeof window !== 'undefined') {
  window.categoryTest = {
    testCategoryState,
    testCategorySelection,
    testNavigationFlow,
    clearCategoryState,
    simulateCategorySelection
  };
  
  console.log('💡 Test functions available:');
  console.log('   categoryTest.testCategoryState() - Check current category state');
  console.log('   categoryTest.testCategorySelection() - Check category selection');
  console.log('   categoryTest.testNavigationFlow() - Show navigation test steps');
  console.log('   categoryTest.clearCategoryState() - Clear category state');
  console.log('   categoryTest.simulateCategorySelection(1) - Simulate selecting category 1');
  console.log('   categoryTest.simulateCategorySelection(null, true) - Simulate selecting deals');
  
  // Auto-run initial tests
  testCategoryState();
  testCategorySelection();
} else {
  console.log('⚠️ This test must be run in a browser environment');
}
