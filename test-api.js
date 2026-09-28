/**
 * Comprehensive API Test Suite
 * Tests all Auth endpoints, validations, refresh token mechanics, and Product CRUD
 */

const BASE_URL = 'http://localhost:5000/api';

async function testSuite() {
  console.log('🧪 Starting E-Commerce REST API Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('--- 1. Testing Health Check ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200 && healthData.status === 'online', 'GET /api/health returns 200 online');

    // 2. Auth - Validation Failures
    console.log('\n--- 2. Testing Auth Validation Rules ---');
    const invalidReg = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A', // too short
        email: 'not-an-email',
        password: 'weak',
        confirmPassword: 'mismatch'
      })
    });
    const invalidRegData = await invalidReg.json();
    assert(invalidReg.status === 400, 'Register returns 400 for invalid inputs');
    assert(invalidRegData.errors && invalidRegData.errors.length >= 3, 'Field-level errors returned for name, email, password, confirmPassword');

    // 3. Auth - Register Unique User
    console.log('\n--- 3. Testing User Registration ---');
    const testEmail = `tester_${Date.now()}@example.com`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Engineer',
        email: testEmail,
        password: 'SecurePassword@123',
        confirmPassword: 'SecurePassword@123'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'POST /api/auth/register returns 201 Created');
    assert(regData.data && regData.data.user && regData.data.user.email === testEmail, 'Returns created user profile');
    assert(!regData.data.user.password && !regData.data.accessToken, 'Returns user WITHOUT password or tokens');

    // 4. Auth - Duplicate Registration Rejection
    console.log('\n--- 4. Testing Duplicate Registration (409 Conflict) ---');
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Duplicate',
        email: testEmail,
        password: 'SecurePassword@123',
        confirmPassword: 'SecurePassword@123'
      })
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 409, 'Duplicate email registration rejected with 409 Conflict');

    // 5. Auth - Login Invalid Credentials
    console.log('\n--- 5. Testing Login with Invalid Password (401) ---');
    const wrongLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword@999'
      })
    });
    assert(wrongLogin.status === 401, 'Invalid password returns 401 Unauthorized');

    // 6. Auth - Login Success
    console.log('\n--- 6. Testing Successful Login & Token Handling ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword@123'
      })
    });
    const loginData = await loginRes.json();
    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert(loginRes.status === 200, 'POST /api/auth/login returns 200 OK');
    assert(loginData.data && !!loginData.data.accessToken, 'Returns short-lived Access Token in JSON body');
    assert(setCookieHeader && setCookieHeader.includes('refreshToken') && setCookieHeader.includes('HttpOnly'), 'Sets long-lived Refresh Token in httpOnly cookie');

    const accessToken = loginData.data.accessToken;
    // Extract refreshToken string from cookie for direct test verification
    const refreshTokenMatch = setCookieHeader.match(/refreshToken=([^;]+)/);
    const refreshToken = refreshTokenMatch ? refreshTokenMatch[1] : null;
    assert(!!refreshToken, 'Successfully captured refreshToken from Set-Cookie header');

    // 7. Auth - GET /api/auth/me (Protected Route)
    console.log('\n--- 7. Testing GET /api/auth/me ---');
    const noAuthMe = await fetch(`${BASE_URL}/auth/me`);
    assert(noAuthMe.status === 401, 'GET /api/auth/me without Bearer token returns 401');

    const authMe = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const authMeData = await authMe.json();
    assert(authMe.status === 200, 'GET /api/auth/me with Bearer token returns 200 OK');
    assert(authMeData.data.user.email === testEmail, 'Attaches req.user correctly and returns profile');

    // 8. Auth - Refresh Token
    console.log('\n--- 8. Testing Refresh Token Flow ---');
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}`
      }
    });
    const refreshData = await refreshRes.json();
    assert(refreshRes.status === 200, 'POST /api/auth/refresh-token verifies against DB and returns 200');
    assert(refreshData.data && !!refreshData.data.accessToken, 'Issues a new valid Access Token');

    const newAccessToken = refreshData.data.accessToken;

    // 9. Product CRUD - Public List & Validation
    console.log('\n--- 9. Testing Public Product List ---');
    const productsRes = await fetch(`${BASE_URL}/products?limit=5`);
    const productsData = await productsRes.json();
    assert(productsRes.status === 200, 'GET /api/products returns 200 OK');
    assert(productsData.data.products && productsData.data.products.length > 0, 'Returns list of products');
    assert(productsData.data.pagination && productsData.data.pagination.total > 0, 'Includes pagination metadata');

    // 10. Product CRUD - Validation on Create Product
    console.log('\n--- 10. Testing Product Create Validations ---');
    const invalidProductRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newAccessToken}`
      },
      body: JSON.stringify({
        title: 'AB', // too short (<3)
        description: 'short', // too short (<10)
        price: -10, // must be >0
        stock: -5, // must be >=0
        category: ''
      })
    });
    const invalidProductData = await invalidProductRes.json();
    assert(invalidProductRes.status === 400, 'POST /api/products returns 400 on invalid input');
    assert(invalidProductData.errors && invalidProductData.errors.length >= 4, 'Rejects with field-level 400 errors prior to controller');

    // 11. Product CRUD - Create Product (Authenticated)
    console.log('\n--- 11. Testing Create Product (Authenticated) ---');
    const createProdRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newAccessToken}`
      },
      body: JSON.stringify({
        title: 'Sony Alpha 7 IV Full-Frame Camera',
        description: '33MP full-frame Exmor R back-illuminated CMOS sensor with real-time autofocus and 4K 60p recording.',
        price: 2498.00,
        category: 'Cameras',
        stock: 14,
        imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
        rating: 4.9
      })
    });
    const createProdData = await createProdRes.json();
    assert(createProdRes.status === 201, 'POST /api/products creates product successfully (201)');
    const createdProductId = createProdData.data.product._id;
    assert(!!createdProductId, `Product ID generated: ${createdProductId}`);

    // 12. Product CRUD - Get Product By ID
    console.log('\n--- 12. Testing GET /api/products/:id ---');
    const getSingleRes = await fetch(`${BASE_URL}/products/${createdProductId}`);
    const getSingleData = await getSingleRes.json();
    assert(getSingleRes.status === 200, 'GET /api/products/:id returns 200 OK');
    assert(getSingleData.data.product.title === 'Sony Alpha 7 IV Full-Frame Camera', 'Product details match');

    // Invalid ObjectId format validation check
    const badIdRes = await fetch(`${BASE_URL}/products/not-a-mongo-id`);
    assert(badIdRes.status === 400, 'Invalid :id format triggers 400 validation error');

    // 13. Product CRUD - Update Product (Authenticated)
    console.log('\n--- 13. Testing PUT /api/products/:id ---');
    const updateRes = await fetch(`${BASE_URL}/products/${createdProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newAccessToken}`
      },
      body: JSON.stringify({
        price: 2399.99,
        stock: 19
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'PUT /api/products/:id returns 200 OK');
    assert(updateData.data.product.price === 2399.99 && updateData.data.product.stock === 19, 'Product updated with new price and stock');

    // 14. Product CRUD - Delete Product (Authenticated)
    console.log('\n--- 14. Testing DELETE /api/products/:id ---');
    const deleteRes = await fetch(`${BASE_URL}/products/${createdProductId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${newAccessToken}`
      }
    });
    assert(deleteRes.status === 200, 'DELETE /api/products/:id returns 200 OK');

    // Verify deletion: querying deleted product returns 404
    const getDeletedRes = await fetch(`${BASE_URL}/products/${createdProductId}`);
    assert(getDeletedRes.status === 404, 'Querying deleted product returns 404 Not Found');

    // Protected routes verify product existence
    const deleteAgainRes = await fetch(`${BASE_URL}/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${newAccessToken}` }
    });
    assert(deleteAgainRes.status === 404, 'DELETE non-existent product returns 404 Not Found');

    // 15. Auth - Logout
    console.log('\n--- 15. Testing POST /api/auth/logout ---');
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${newAccessToken}`,
        Cookie: `refreshToken=${refreshToken}`
      }
    });
    const logoutCookie = logoutRes.headers.get('set-cookie');
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');
    assert(logoutCookie && (logoutCookie.includes('refreshToken=;') || logoutCookie.includes('Max-Age=0')), 'Clears refreshToken cookie');

    // 16. Verify Invalidation: old refresh token must be rejected by DB
    console.log('\n--- 16. Testing Refresh Token Revocation After Logout ---');
    const revokedRefreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `refreshToken=${refreshToken}`
      }
    });
    assert(revokedRefreshRes.status === 403, 'Revoked refresh token rejected with 403 Forbidden');

    console.log('\n======================================================');
    console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

testSuite();
