const { test } = require("node:test");
const assert = require("node:assert/strict");
const { NextRequest } = require("next/server");
// Next 16.4 still exports this testing utility under its former name.
const { unstable_doesMiddlewareMatch } = require("next/experimental/testing/server");
const { moduleLoader } = require("./load-module.cjs");

const allowedEmail = "operator@example.test";
const pages = ["", "parametros", "camaras", "reportes/diario", "reportes/unificado",
  "eventos", "historico", "estadisticas", "configuracion", "auditoria"];

function environment(t) {
  const values = {
    CONTROL_USER_EMAIL: allowedEmail,
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_fixture",
  };
  const original = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function fixture(t) {
  environment(t);
  const state = {
    user: { id: "user-id", email: allowedEmail, extraPrivateField: "not returned" },
    userError: null, signInError: null, claims: { sub: "user-id" }, claimsError: null,
    signOutError: null, refresh: [], claimsThrows: false, userThrows: false,
    cleared: 0, userCalls: 0, signInCalls: [], signOutCalls: [], revalidated: [],
  };
  const client = { auth: {
    getUser: async () => {
      state.userCalls++;
      if (state.userThrows) throw new Error("Auth unavailable");
      return { data: { user: state.user }, error: state.userError };
    },
    signInWithPassword: async (input) => {
      state.signInCalls.push(input);
      return { error: state.signInError };
    },
    signOut: async (options) => {
      state.signOutCalls.push(options);
      return { error: state.signOutError };
    },
  } };
  const redirect = (destination) => { throw Object.assign(new Error("redirect"), { destination }); };
  const load = moduleLoader({
    "next/navigation": { redirect },
    "next/cache": { revalidatePath: (...args) => state.revalidated.push(args) },
    "@/lib/supabase/server": {
      createClient: async () => client,
      clearAuthCookies: async () => { state.cleared++; },
    },
    "@supabase/ssr": { createServerClient: (_url, _key, options) => ({ auth: {
      getClaims: async () => {
        for (const cookies of state.refresh) {
          options.cookies.setAll(cookies, { "Cache-Control": "private, no-store", Expires: "0", Pragma: "no-cache" });
        }
        if (state.claimsThrows) throw new Error("Auth unavailable");
        return { data: { claims: state.claims }, error: state.claimsError };
      },
    } }) },
  });
  return { state, client, load };
}

function form(email = allowedEmail, password = "test-only-password") {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

const redirectedTo = (destination) => (error) => error.destination === destination;

test("visitante sin sesión: autorización denegada", async (t) => {
  const { state, load } = fixture(t);
  state.user = null;
  state.userError = { name: "AuthSessionMissingError" };
  assert.deepEqual(await load("src/lib/auth.ts").getAuthorization(), { status: "session" });
});

test("cuenta autorizada: sólo devuelve id y correo verificados", async (t) => {
  const { state, load } = fixture(t);
  assert.deepEqual(await load("src/lib/auth.ts").requireAuthorizedUser(), {
    id: "user-id", email: allowedEmail,
  });
  assert.equal(state.userCalls, 1);
});

test("correo y configuración se normalizan sin distinguir mayúsculas", async (t) => {
  const { state, load } = fixture(t);
  state.user.email = " OPERATOR@EXAMPLE.TEST ";
  process.env.CONTROL_USER_EMAIL = " Operator@Example.Test ";
  assert.equal((await load("src/lib/auth.ts").getAuthorization()).status, "authorized");
});

for (const email of ["other@example.test", "operator+alias@example.test", undefined, "invalid", "operator@example.test.evil"]) {
  test(`rechaza identidad no autorizada: ${email}`, async (t) => {
    const { state, load } = fixture(t);
    state.user.email = email;
    assert.deepEqual(await load("src/lib/auth.ts").getAuthorization(), { status: "denied" });
  });
}

for (const configured of [undefined, "", "   ", "invalid"]) {
  test(`CONTROL_USER_EMAIL inválida falla de forma cerrada: ${JSON.stringify(configured)}`, async (t) => {
    const { state, load } = fixture(t);
    if (configured === undefined) delete process.env.CONTROL_USER_EMAIL;
    else process.env.CONTROL_USER_EMAIL = configured;
    assert.deepEqual(await load("src/lib/auth.ts").getAuthorization(), { status: "configuration" });
    assert.equal(state.userCalls, 0);
  });
}

test("cuenta revocada con claims vigentes no supera getUser", async (t) => {
  const { state, load } = fixture(t);
  state.userError = { status: 403 };
  await assert.rejects(load("src/lib/auth.ts").requireAuthorizedUser(), redirectedTo("/login?reason=session"));
});

test("fallos de red y Auth 503 no conceden acceso", async (t) => {
  const { state, load } = fixture(t);
  const { getAuthorization } = load("src/lib/auth.ts");
  state.userError = { status: 503 };
  assert.equal((await getAuthorization()).status, "unavailable");
  state.userThrows = true;
  assert.equal((await getAuthorization()).status, "unavailable");
});

test("login incorrecto muestra mensaje genérico sin revelar detalles de Supabase", async (t) => {
  const { state, load } = fixture(t);
  state.signInError = { status: 400, message: "User does not exist: private detail" };
  const result = await load("src/app/(auth)/login/actions.ts").signIn({ error: "" }, form());
  assert.equal(result.error, "No se pudo iniciar sesión. Revisa tu correo y contraseña.");
  assert.equal(state.userCalls, 0);
  assert.deepEqual(state.revalidated, []);
});

test("login rechaza campos ausentes antes de contactar Auth", async (t) => {
  const { state, load } = fixture(t);
  const result = await load("src/app/(auth)/login/actions.ts").signIn({ error: "" }, form("", ""));
  assert.ok(result.error);
  assert.equal(state.signInCalls.length, 0);
});

test("login autorizado verifica getUser, invalida caché y redirige a /", async (t) => {
  const { state, load } = fixture(t);
  const password = "  test-only-password  ";
  await assert.rejects(load("src/app/(auth)/login/actions.ts").signIn({ error: "" }, form(allowedEmail, password)), redirectedTo("/"));
  assert.equal(state.userCalls, 1);
  assert.equal(state.signInCalls[0].password, password);
  assert.deepEqual(state.revalidated, [["/", "layout"]]);
});

test("login nunca autoriza por el correo del formulario y elimina la sesión rechazada", async (t) => {
  const { state, load } = fixture(t);
  state.user.email = "other@example.test";
  const result = await load("src/app/(auth)/login/actions.ts").signIn({ error: "" }, form(allowedEmail));
  assert.match(result.error, /no tiene acceso/);
  assert.deepEqual(state.signOutCalls, [{ scope: "local" }]);
  assert.equal(state.cleared, 1);
  assert.deepEqual(state.revalidated, []);
});

test("login elimina la sesión nueva si falla su verificación actual", async (t) => {
  const { state, load } = fixture(t);
  state.userError = { status: 503 };
  const result = await load("src/app/(auth)/login/actions.ts").signIn({ error: "" }, form());
  assert.ok(result.error);
  assert.equal(state.cleared, 1);
  assert.equal(state.signOutCalls.length, 1);
});

test("logout usa alcance local, limpia cookies, invalida caché y redirige", async (t) => {
  const { state, load } = fixture(t);
  await assert.rejects(load("src/app/(auth)/login/actions.ts").signOut(), redirectedTo("/login"));
  assert.deepEqual(state.signOutCalls, [{ scope: "local" }]);
  assert.equal(state.cleared, 1);
  assert.deepEqual(state.revalidated, [["/", "layout"]]);
});

test("logout limpia cookies aunque falle Supabase e informa cierre sólo local", async (t) => {
  const { state, load } = fixture(t);
  state.signOutError = { status: 503 };
  await assert.rejects(load("src/app/(auth)/login/actions.ts").signOut(), redirectedTo("/login?reason=logout-local"));
  assert.equal(state.cleared, 1);
});

for (const page of pages) {
  test(`página /${page}: requiere autorización propia además del layout`, async (t) => {
    const { state, load } = fixture(t);
    const Page = load(`src/app/(app)/${page ? `${page}/` : ""}page.tsx`).default;
    assert.ok(await Page());
    state.user.email = "other@example.test";
    await assert.rejects(Page(), redirectedTo("/login?reason=denied"));
    state.user = null;
    await assert.rejects(Page(), redirectedTo("/login?reason=session"));
  });
}

test("layout verifica autorización antes de devolver el encabezado privado", async (t) => {
  const { state, load } = fixture(t);
  const Layout = load("src/app/(app)/layout.tsx").default;
  assert.ok(await Layout({ children: "private content" }));
  state.user = null;
  await assert.rejects(Layout({ children: "private content" }), redirectedTo("/login?reason=session"));
});

test("/login redirige sólo la cuenta actualmente autorizada; las demás ven el formulario", async (t) => {
  const { state, load } = fixture(t);
  const Page = load("src/app/(auth)/login/page.tsx").default;
  const props = { searchParams: Promise.resolve({}) };
  await assert.rejects(Page(props), redirectedTo("/"));
  state.user.email = "other@example.test";
  assert.ok(await Page(props));
  state.user = null;
  assert.ok(await Page(props));
  state.userError = { status: 503 };
  assert.ok(await Page(props));
});

test("proxy renueva cookies en request/response y conserva opciones del SDK", async (t) => {
  const { state, load } = fixture(t);
  const options = { path: "/", sameSite: "lax", secure: true, httpOnly: true, maxAge: 120 };
  state.refresh = [[{ name: "sb-test-auth-token.0", value: "refreshed-fixture", options }]];
  const request = new NextRequest("http://localhost:3000/parametros");
  const response = await load("src/lib/supabase/proxy.ts").updateSession(request);
  assert.equal(request.cookies.get("sb-test-auth-token.0").value, "refreshed-fixture");
  const cookie = response.cookies.get("sb-test-auth-token.0");
  assert.equal(cookie.value, "refreshed-fixture");
  for (const [key, value] of Object.entries(options)) assert.equal(cookie[key], value);
  assert.match(response.headers.get("cache-control"), /private.*no-store/);
  assert.equal(response.headers.get("pragma"), "no-cache");
  assert.equal(response.headers.get("expires"), "0");
  assert.equal(response.headers.get("location"), null);
});

test("proxy conserva todas las cookies incluso con múltiples setAll y redirección", async (t) => {
  const { state, load } = fixture(t);
  state.claims = null;
  state.refresh = [
    [{ name: "sb-test-auth-token.0", value: "", options: { maxAge: 0, path: "/" } }],
    [{ name: "sb-test-auth-token.1", value: "", options: { maxAge: 0, path: "/" } }],
  ];
  const response = await load("src/lib/supabase/proxy.ts").updateSession(new NextRequest("http://localhost:3000/eventos"));
  assert.equal(response.status, 307);
  assert.equal(response.cookies.getAll().length, 2);
  for (const cookie of response.cookies.getAll()) assert.equal(cookie.maxAge, 0);
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("sesión expirada sin renovación: rutas privadas van a login y login no redirige", async (t) => {
  const { state, load } = fixture(t);
  state.claims = null;
  state.claimsError = { status: 400 };
  const { updateSession } = load("src/lib/supabase/proxy.ts");
  for (const page of pages) {
    const response = await updateSession(new NextRequest(`http://localhost:3000/${page}?ignored=value`));
    assert.equal(response.headers.get("location"), "http://localhost:3000/login?reason=session");
  }
  const login = await updateSession(new NextRequest("http://localhost:3000/login?reason=session"));
  assert.equal(login.headers.get("location"), null);
});

test("claims vigentes en /login no provocan bucle aunque getUser rechace la cuenta", async (t) => {
  const { state, load } = fixture(t);
  state.userError = { status: 403 };
  const response = await load("src/lib/supabase/proxy.ts").updateSession(new NextRequest("http://localhost:3000/login"));
  assert.equal(response.headers.get("location"), null);
  assert.ok(await load("src/app/(auth)/login/page.tsx").default({ searchParams: Promise.resolve({}) }));
});

test("proxy falla cerrado si Auth lanza excepción o falta configuración", async (t) => {
  const { state, load } = fixture(t);
  const { updateSession } = load("src/lib/supabase/proxy.ts");
  state.claimsThrows = true;
  assert.match((await updateSession(new NextRequest("http://localhost:3000/"))).headers.get("location"), /reason=unavailable$/);
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.match((await updateSession(new NextRequest("http://localhost:3000/"))).headers.get("location"), /reason=unavailable$/);
});

test("fallo parcial de Auth: login no vuelve a / si Proxy no pudo verificar el token", async (t) => {
  const { state, load } = fixture(t);
  state.claimsThrows = true;
  const response = await load("src/lib/supabase/proxy.ts").updateSession(new NextRequest("http://localhost:3000/"));
  const loginUrl = new URL(response.headers.get("location"));
  assert.equal(loginUrl.searchParams.get("reason"), "unavailable");
  // getUser succeeds, while verification in Proxy still fails.
  assert.ok(await load("src/app/(auth)/login/page.tsx").default({
    searchParams: Promise.resolve(Object.fromEntries(loginUrl.searchParams)),
  }));
});

test("matcher incluye páginas y acciones en /login, excluye recursos estáticos", (t) => {
  const { load } = fixture(t);
  const { config } = load("src/proxy.ts");
  for (const url of ["/login", "/api/private", ...pages.map((page) => `/${page}`)]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), true, url);
  }
  for (const url of ["/_next/static/app.js", "/_next/image?url=logo.png", "/favicon.ico", "/logo.svg", "/robots.txt"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), false, url);
  }
});

function cookieAdapter(t) {
  environment(t);
  const jar = new Map([["sb-test-auth-token.0", "fixture"], ["sb-other-auth-token", "unrelated"], ["preference", "dark"]]);
  const written = [];
  let adapter;
  let failWrite = false;
  const cookieStore = {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    set: (name, value, options) => {
      if (failWrite) throw new Error("write failed");
      written.push({ name, value, options });
      jar.set(name, value);
    },
  };
  const ssr = require("@supabase/ssr");
  const load = moduleLoader({
    "next/headers": { cookies: async () => cookieStore },
    "@supabase/ssr": { ...ssr, createServerClient: (_url, _key, options) => {
      adapter = options.cookies;
      return { auth: {} };
    } },
  });
  return { server: load("src/lib/supabase/server.ts"), written,
    get adapter() { return adapter; }, set failWrite(value) { failWrite = value; } };
}

test("cliente servidor usa cookies async: getAll y setAll sólo escriben en contextos permitidos", async (t) => {
  const fixture = cookieAdapter(t);
  const cookie = { name: "sb-test-auth-token.0", value: "refreshed", options: { path: "/", sameSite: "lax", secure: true } };
  await fixture.server.createClient();
  assert.equal(fixture.adapter.getAll().length, 3);
  fixture.adapter.setAll([cookie]);
  assert.equal(fixture.written.length, 0);
  await fixture.server.createClient({ canWriteCookies: true });
  fixture.adapter.setAll([cookie]);
  assert.deepEqual(fixture.written, [cookie]);
  fixture.failWrite = true;
  assert.throws(() => fixture.adapter.setAll([cookie]), /write failed/);
});

test("limpieza local expira sólo cookies del proyecto, conserva otras cookies", async (t) => {
  const fixture = cookieAdapter(t);
  await fixture.server.clearAuthCookies();
  assert.equal(fixture.written.length, 1);
  assert.equal(fixture.written[0].name, "sb-test-auth-token.0");
  assert.equal(fixture.written[0].value, "");
  assert.equal(fixture.written[0].options.maxAge, 0);
  assert.equal(fixture.written[0].options.path, "/");
});
