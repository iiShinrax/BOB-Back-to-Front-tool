# Testing Guide for BOB Backend Generator Extension

## Quick Test Setup

### 1. Prepare the Extension

```bash
# Make sure you're in the extension directory
cd BOB-Back-to-Front-tool

# Install dependencies (if not already done)
npm install

# Compile the extension
npm run compile
```

### 2. Set Up API Key

Create a `.env` file in the extension root:

```env
OPENROUTER_API_KEY=your_actual_api_key_here
```

### 3. Launch Extension Development Host

**Option A: Using VS Code UI**

1. Open the extension project in VS Code
2. Press `F5`
3. A new VS Code window will open with the extension loaded

**Option B: Using Debug Menu**

1. Go to Run → Start Debugging
2. Select "Run Extension"

### 4. Test with a Sample Project

#### Create a Test Frontend Project

In the Extension Development Host window:

1. Create a new folder for testing
2. Create some sample React components:

```bash
mkdir test-frontend
cd test-frontend
mkdir -p src/components
```

Create `src/components/ProductList.tsx`:

```typescript
import React from 'react';

export const ProductList = () => {
  const products = [
    { id: 1, name: 'Product 1', price: 100 },
    { id: 2, name: 'Product 2', price: 200 }
  ];

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  );
};
```

Create `src/components/Cart.tsx`:

```typescript
import React from 'react';

export const Cart = () => {
  const cartItems = [];

  return (
    <div>
      <h2>Shopping Cart</h2>
      {cartItems.length === 0 ? (
        <p>Cart is empty</p>
      ) : (
        <ul>
          {cartItems.map(item => (
            <li key={item.id}>{item.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

Create `src/components/Checkout.tsx`:

```typescript
import React from 'react';

export const Checkout = () => {
  return (
    <div>
      <h2>Checkout</h2>
      <form>
        <input type="text" placeholder="Name" />
        <input type="email" placeholder="Email" />
        <button type="submit">Complete Order</button>
      </form>
    </div>
  );
};
```

### 5. Run the Extension

1. In the Extension Development Host window, open the test-frontend folder
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type: "BOB: Generate Backend from Current Workspace"
4. Press Enter

### 6. Monitor Progress

Watch the notifications and output:

- Check the progress notification
- Open Output panel (View → Output)
- Select "BOB - backend Install" or "BOB - frontend Install" from dropdown

### 7. Verify Results

After completion, check:

1. **Backend folder created:**

   ```
   test-frontend/generated-backend/
   ```

2. **Backend files generated:**
   - `src/server.ts`
   - `src/routes/*.ts`
   - `src/models/*.ts`
   - `src/controllers/*.ts`
   - `package.json`
   - `tsconfig.json`
   - `.env.example`
   - `README.md`

3. **Frontend components updated:**
   - Check if mock data was removed
   - Verify API calls were added
   - Look for axios imports

4. **Dependencies installed:**
   - Backend: `node_modules` folder exists
   - Frontend: axios added to dependencies

### 8. Test the Generated Backend

```bash
cd generated-backend

# Copy environment template
cp .env.example .env

# Edit .env and add MongoDB URI
# MONGODB_URI=mongodb://localhost:27017/test-db

# Run the backend
npm run dev
```

Expected output:

```
Server running on port 3000
Connected to MongoDB
```

### 9. Test API Endpoints

Use curl or Postman to test:

```bash
# Example: Get all products
curl http://localhost:3000/api/products

# Example: Create a product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Product","price":99.99}'
```

## Common Test Scenarios

### Scenario 1: E-commerce App

Components: `ProductList.tsx`, `Cart.tsx`, `Checkout.tsx`, `OrderHistory.tsx`

Expected backend:

- Product model with name, price, description, image
- Cart model with user, items, total
- Order model with user, items, status, date
- Routes for products, cart, orders

### Scenario 2: Blog App

Components: `PostList.tsx`, `PostDetail.tsx`, `CommentSection.tsx`, `AuthorProfile.tsx`

Expected backend:

- Post model with title, content, author, date
- Comment model with post, author, content
- Author model with name, bio, posts
- Routes for posts, comments, authors

### Scenario 3: Task Manager

Components: `TaskList.tsx`, `TaskDetail.tsx`, `ProjectBoard.tsx`, `UserDashboard.tsx`

Expected backend:

- Task model with title, description, status, assignee
- Project model with name, tasks, members
- User model with name, email, tasks
- Routes for tasks, projects, users

## Debugging Tips

### Extension Not Activating

1. Check the Extension Development Host console
2. Look for activation errors
3. Verify `package.json` activation events

### No Screens Found

1. Ensure component files have correct extensions (.tsx, .jsx, .ts, .js)
2. Check that files aren't in excluded directories
3. Verify file names don't match excluded patterns

### AI Generation Fails

1. Check API key is valid
2. Verify internet connection
3. Look at Output panel for detailed errors
4. Check if rate limited (wait and retry)

### Frontend Refactoring Fails

1. Check component file structure
2. Verify files are readable/writable
3. Look for syntax errors in original files
4. Check Output panel for specific errors

### Dependency Installation Fails

1. Verify npm is installed and accessible
2. Check internet connection
3. Look at terminal output for npm errors
4. Try manual installation: `cd generated-backend && npm install`

## Performance Testing

### Test with Different Project Sizes

1. **Small project** (3-5 components)
   - Expected time: 1-2 minutes
2. **Medium project** (10-15 components)
   - Expected time: 3-5 minutes
3. **Large project** (20+ components)
   - Expected time: 5-10 minutes

### Monitor Resource Usage

1. Check CPU usage during generation
2. Monitor memory consumption
3. Watch network activity for API calls

## Automated Testing

### Unit Tests (Future)

```bash
npm test
```

### Integration Tests (Future)

Test the complete workflow:

1. Create test project
2. Run extension
3. Verify generated files
4. Test backend endpoints
5. Verify frontend integration

## Reporting Issues

When reporting issues, include:

1. **Extension version**
2. **VS Code version**
3. **Operating system**
4. **Steps to reproduce**
5. **Expected behavior**
6. **Actual behavior**
7. **Error messages** (from Output panel)
8. **Sample project structure** (if possible)

## Success Criteria

A successful test should result in:

✅ Backend folder created
✅ All expected files generated
✅ Valid TypeScript code
✅ Dependencies installed successfully
✅ Backend server starts without errors
✅ API endpoints respond correctly
✅ Frontend components updated
✅ No compilation errors

## Next Steps After Testing

1. Review generated code quality
2. Test API endpoints thoroughly
3. Verify database operations
4. Check error handling
5. Test frontend integration
6. Deploy to staging environment
7. Gather user feedback

---

**Happy Testing! 🚀**
