const assert = require("assert");
const jwt = require("jsonwebtoken");

// Mock client database queries for unit testing middlewares
const mockClient = {
  userTokens: new Map(),
  adminTokens: new Map(),
  users: new Map(),
  admins: new Map(),
  deletedTokens: [],

  async query(text, params) {
    const sql = text.toLowerCase();

    // user_token insert
    if (sql.includes("insert into user_token")) {
      const [token, isValid, emsToken, createdAt, updatedAt, fkUser] = params;
      this.userTokens.set(token, {
        token,
        is_valid: isValid,
        ems_token: emsToken,
        created_at: createdAt,
        updated_at: updatedAt,
        fk_user: fkUser,
      });
      return { rowCount: 1, rows: [] };
    }

    // admin_token insert
    if (sql.includes("insert into admin_token")) {
      const [token, isValid, createdAt, updatedAt, fkAdmin] = params;
      this.adminTokens.set(token, {
        token,
        is_valid: isValid,
        created_at: createdAt,
        updated_at: updatedAt,
        fk_admin: fkAdmin,
      });
      return { rowCount: 1, rows: [] };
    }

    // user_token delete
    if (sql.includes("delete from user_token where token = $1")) {
      const [token] = params;
      const existed = this.userTokens.delete(token);
      this.deletedTokens.push({ table: "user_token", token });
      return { rowCount: existed ? 1 : 0 };
    }

    // admin_token delete
    if (sql.includes("delete from admin_token where token = $1")) {
      const [token] = params;
      const existed = this.adminTokens.delete(token);
      this.deletedTokens.push({ table: "admin_token", token });
      return { rowCount: existed ? 1 : 0 };
    }

    // user_token select
    if (sql.includes("select * from user_token where token = $1")) {
      const [token] = params;
      const record = this.userTokens.get(token);
      if (record && record.is_valid) {
        return { rowCount: 1, rows: [record] };
      }
      return { rowCount: 0, rows: [] };
    }

    // admin_token select
    if (sql.includes("select * from admin_token where token = $1")) {
      const [token] = params;
      const record = this.adminTokens.get(token);
      if (record && record.is_valid) {
        return { rowCount: 1, rows: [record] };
      }
      return { rowCount: 0, rows: [] };
    }

    // users select
    if (sql.includes("from users where id = $1")) {
      const [id] = params;
      const user = this.users.get(id);
      return user ? { rowCount: 1, rows: [user] } : { rowCount: 0, rows: [] };
    }

    // admin select
    if (sql.includes("from admin where id = $1")) {
      const [id] = params;
      const admin = this.admins.get(id);
      return admin ? { rowCount: 1, rows: [admin] } : { rowCount: 0, rows: [] };
    }

    throw new Error(`Unhandled mock query: ${text}`);
  },
};

// Replace client require in cache with mock
const connectModulePath = require.resolve("./db/connect");
require.cache[connectModulePath] = {
  id: connectModulePath,
  filename: connectModulePath,
  loaded: true,
  exports: mockClient,
};

process.env.TOKEN_SECRET = "test_super_secret_key_12345";

// Load modules under test
const { generateUserToken, generateAdminToken } = require("./utils/generateUserTokens");
const isUserAuthenticated = require("./middleware/userMiddleware");
const { isAdminAuthenticated } = require("./middleware/adminMiddlewares");

async function runSessionTests() {
  console.log("==================================================");
  console.log("🧪 TESTING 1-DAY SESSION TOKENS IMPLEMENTATION");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error("     ", err.message);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error("     ", err.message);
    }
  }

  // Setup test users & admins in mock
  mockClient.users.set(101, {
    id: 101,
    first_name: "Participant",
    last_name: "One",
    email: "participant@pulzion.co.in",
    mobile_number: "9988776655",
    college: "PICT",
    year: "TE",
    ems_id: 1001,
  });

  mockClient.admins.set(501, {
    id: 501,
    username: "superadmin",
  });

  // 1. User Token Generation
  console.log("1. User Token Generation & 1-Day Expiry Claims:");
  let userToken;
  await asyncTest("generateUserToken generates valid JWT with 1 day (86400s) lifetime", async () => {
    userToken = await generateUserToken(101, "ems_mock_token_abc");
    assert(typeof userToken === "string", "Token must be a string");
    const decoded = jwt.verify(userToken, process.env.TOKEN_SECRET);
    assert.strictEqual(decoded.id, 101);
    const durationSeconds = decoded.exp - decoded.iat;
    assert.strictEqual(durationSeconds, 86400, "Duration must be exactly 86400 seconds (1 day)");
  });

  // 2. Admin Token Generation
  console.log("\n2. Admin Token Generation & 1-Day Expiry Claims:");
  let adminToken;
  await asyncTest("generateAdminToken generates valid JWT with 1 day (86400s) lifetime", async () => {
    adminToken = await generateAdminToken(501);
    assert(typeof adminToken === "string", "Token must be a string");
    const decoded = jwt.verify(adminToken, process.env.TOKEN_SECRET);
    assert.strictEqual(decoded.id, 501);
    const durationSeconds = decoded.exp - decoded.iat;
    assert.strictEqual(durationSeconds, 86400, "Duration must be exactly 86400 seconds (1 day)");
  });

  // Helper mock Express req, res, next
  function createMockHttp(headers = {}, query = {}) {
    const req = {
      headers: { ...headers },
      query: { ...query },
      header(name) {
        return this.headers[name] || this.headers[name.toLowerCase()];
      },
    };
    let responseStatus = 200;
    let responseJson = null;
    let nextCalled = false;

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseJson = data;
        return this;
      },
      send(data) {
        responseJson = data;
        return this;
      },
    };

    const next = () => {
      nextCalled = true;
    };

    return { req, res, next, getResult: () => ({ responseStatus, responseJson, nextCalled }) };
  }

  // 3. User Middleware Authentication
  console.log("\n3. User Authentication Middleware (isUserAuthenticated):");

  await asyncTest("Allows valid 1-day Bearer token and attaches user profile", async () => {
    const { req, res, next, getResult } = createMockHttp({
      authorization: `Bearer ${userToken}`,
    });
    await isUserAuthenticated(req, res, next);
    const result = getResult();
    assert.strictEqual(result.nextCalled, true, "next() must be called");
    assert.strictEqual(req.user.id, 101);
    assert.strictEqual(req.user.email, "participant@pulzion.co.in");
    assert.strictEqual(req.ems_token, "ems_mock_token_abc");
    assert.strictEqual(req.token, userToken);
  });

  await asyncTest("Rejects missing Authorization header with 401", async () => {
    const { req, res, next, getResult } = createMockHttp({});
    await isUserAuthenticated(req, res, next);
    const result = getResult();
    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(result.responseStatus, 401);
  });

  await asyncTest("Rejects expired token with 401 Session expired", async () => {
    // Create token with 0s expiration
    const expiredToken = jwt.sign({ id: 101 }, process.env.TOKEN_SECRET, { expiresIn: "0s" });
    mockClient.userTokens.set(expiredToken, {
      token: expiredToken,
      is_valid: true,
      ems_token: "ems_test",
      created_at: new Date(),
      updated_at: new Date(),
      fk_user: 101,
    });

    const { req, res, next, getResult } = createMockHttp({
      authorization: `Bearer ${expiredToken}`,
    });
    await isUserAuthenticated(req, res, next);
    const result = getResult();
    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(result.responseStatus, 401);
    assert(result.responseJson?.error?.includes("Session expired"), "Error message mentions Session expired");
    assert(!mockClient.userTokens.has(expiredToken), "Expired token cleaned from DB");
  });

  await asyncTest("Rejects token older than 1 day in DB even if JWT claim was forged", async () => {
    // Create token with 10d jwt expiry but DB timestamp from 2 days ago
    const forgedToken = jwt.sign({ id: 101 }, process.env.TOKEN_SECRET, { expiresIn: "10d" });
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    mockClient.userTokens.set(forgedToken, {
      token: forgedToken,
      is_valid: true,
      ems_token: "ems_test",
      created_at: twoDaysAgo,
      updated_at: twoDaysAgo,
      fk_user: 101,
    });

    const { req, res, next, getResult } = createMockHttp({
      authorization: `Bearer ${forgedToken}`,
    });
    await isUserAuthenticated(req, res, next);
    const result = getResult();
    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(result.responseStatus, 401);
    assert(result.responseJson?.error?.includes("Session expired"), "DB 1-day check triggers session expired");
  });

  // 4. Admin Middleware Authentication
  console.log("\n4. Admin Authentication Middleware (isAdminAuthenticated):");

  await asyncTest("Allows valid 1-day Bearer token and attaches admin profile", async () => {
    const { req, res, next, getResult } = createMockHttp({
      authorization: `Bearer ${adminToken}`,
    });
    await isAdminAuthenticated(req, res, next);
    const result = getResult();
    assert.strictEqual(result.nextCalled, true, "next() must be called");
    assert.strictEqual(req.admin.id, 501);
    assert.strictEqual(req.admin.username, "superadmin");
    assert.strictEqual(req.token, adminToken);
  });

  await asyncTest("Allows valid 1-day token via ?token= query parameter", async () => {
    const { req, res, next, getResult } = createMockHttp({}, { token: adminToken });
    await isAdminAuthenticated(req, res, next);
    const result = getResult();
    assert.strictEqual(result.nextCalled, true);
    assert.strictEqual(req.admin.id, 501);
  });

  await asyncTest("Allows valid 1-day token via ?admin_token= query parameter", async () => {
    const { req, res, next, getResult } = createMockHttp({}, { admin_token: adminToken });
    await isAdminAuthenticated(req, res, next);
    const result = getResult();
    assert.strictEqual(result.nextCalled, true);
    assert.strictEqual(req.admin.id, 501);
  });

  await asyncTest("Rejects expired admin token with 401 Session expired", async () => {
    const expiredAdminToken = jwt.sign({ id: 501 }, process.env.TOKEN_SECRET, { expiresIn: "0s" });
    mockClient.adminTokens.set(expiredAdminToken, {
      token: expiredAdminToken,
      is_valid: true,
      created_at: new Date(),
      updated_at: new Date(),
      fk_admin: 501,
    });

    const { req, res, next, getResult } = createMockHttp({
      authorization: `Bearer ${expiredAdminToken}`,
    });
    await isAdminAuthenticated(req, res, next);
    const result = getResult();
    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(result.responseStatus, 401);
    assert(result.responseJson?.error?.includes("Session expired"), "Error message mentions Session expired");
    assert(!mockClient.adminTokens.has(expiredAdminToken), "Expired admin token cleaned from DB");
  });

  console.log("\n==================================================");
  console.log(`Summary: ${passed} / ${total} tests passed.`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runSessionTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
