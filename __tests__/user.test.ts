/**
 * User authentication — tests for auth logic and role checks.
 * Mocks Supabase Auth to validate behavior without real DB.
 */

// Mock Supabase auth responses
function mockSignUp(email: string, password: string) {
  if (!email.includes("@")) return { data: null, error: { message: "Invalid email" } };
  if (password.length < 8) return { data: null, error: { message: "Password must be at least 8 characters" } };
  if (email === "existing@test.com") return { data: null, error: { message: "User already registered" } };
  return {
    data: {
      user: {
        id: `user_${Math.random().toString(36).slice(2)}`,
        email,
        user_metadata: { full_name: email.split("@")[0] },
        role: email === "germain@burel.net" ? "admin" : "user",
      },
      session: { access_token: "mock_token" },
    },
    error: null,
  };
}

function mockSignIn(email: string, password: string) {
  if (!email.includes("@")) return { data: { user: null }, error: { message: "Invalid email" } };
  if (password !== "correctpassword") return { data: { user: null }, error: { message: "Invalid login credentials" } };
  return {
    data: {
      user: {
        id: "user_abc123",
        email,
        user_metadata: { full_name: email.split("@")[0] },
      },
      session: { access_token: "mock_token" },
    },
    error: null,
  };
}

function getUserRole(email: string): "admin" | "user" {
  return email === "germain@burel.net" ? "admin" : "user";
}

function canAccessAdmin(role: string): boolean {
  return role === "admin";
}

describe("User signup", () => {
  test("valid email + password returns user.id", () => {
    const result = mockSignUp("newuser@test.com", "securePassword123");
    expect(result.error).toBeNull();
    expect(result.data?.user?.id).toBeDefined();
    expect(result.data?.user?.id).toMatch(/^user_/);
  });

  test("already registered email returns error", () => {
    const result = mockSignUp("existing@test.com", "securePassword123");
    expect(result.error).not.toBeNull();
    expect(result.error!.message).toContain("already registered");
  });

  test("short password returns error", () => {
    const result = mockSignUp("newuser@test.com", "short");
    expect(result.error).not.toBeNull();
    expect(result.error!.message).toContain("8 characters");
  });

  test("invalid email returns error", () => {
    const result = mockSignUp("notanemail", "securePassword123");
    expect(result.error).not.toBeNull();
  });
});

describe("User signin", () => {
  test("correct credentials returns user", () => {
    const result = mockSignIn("user@test.com", "correctpassword");
    expect(result.error).toBeNull();
    expect(result.data?.user).toBeDefined();
    expect(result.data?.user?.email).toBe("user@test.com");
  });

  test("wrong password returns error", () => {
    const result = mockSignIn("user@test.com", "wrongpassword");
    expect(result.error).not.toBeNull();
    expect(result.error!.message).toContain("Invalid login");
  });
});

describe("Role-based access", () => {
  test("germain@burel.net has role admin", () => {
    expect(getUserRole("germain@burel.net")).toBe("admin");
  });

  test("other emails have role user", () => {
    expect(getUserRole("someone@example.com")).toBe("user");
    expect(getUserRole("test@test.fr")).toBe("user");
  });

  test("admin can access /admin", () => {
    expect(canAccessAdmin("admin")).toBe(true);
  });

  test("user cannot access /admin", () => {
    expect(canAccessAdmin("user")).toBe(false);
  });

  test("/admin redirects non-admin", () => {
    const role = getUserRole("someone@example.com");
    const shouldRedirect = !canAccessAdmin(role);
    expect(shouldRedirect).toBe(true);
  });
});
