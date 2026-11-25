import { expect, test, type Browser, type Page } from "@playwright/test";

// El servidor es único y está en memoria: cada prueba usa aliases con sufijo propio.
const suffix = () => Math.random().toString(36).slice(2, 7);

async function open(browser: Browser): Promise<Page> {
  // Un contexto por participante: sessionStorage y cookies independientes.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  return page;
}

async function enter(page: Page, alias: string) {
  await page.getByLabel("Tu nombre").fill(alias);
  await page.getByRole("button", { name: "Entrar" }).click();
}

const inRoom = (page: Page, alias: string) => expect(page.getByTestId("self-alias")).toHaveText(alias);

test.afterEach(async ({ browser }) => {
  await Promise.all(browser.contexts().map((c) => c.close()));
});

test("E2E-6: antes de entrar no hay sala, pizarra ni chat", async ({ browser }) => {
  const page = await open(browser);
  await expect(page.getByTestId("entry-screen")).toBeVisible();
  await expect(page.getByTestId("room-screen")).toHaveCount(0);
  await expect(page.getByTestId("board")).toHaveCount(0);
  await expect(page.getByTestId("chat")).toHaveCount(0);
  await expect(page.getByLabel("Tu nombre")).toBeFocused();
});

test("E2E-1: un alias libre ingresa y ve la sala", async ({ browser }) => {
  const page = await open(browser);
  const alias = `Ada-${suffix()}`;
  await enter(page, alias);
  await inRoom(page, alias);
  await expect(page.getByTestId("entry-screen")).toHaveCount(0);
  await expect(page.getByTestId("connection-indicator")).toHaveText("Conectado");
});

test("E2E-2: alias repetido (otras mayúsculas) o inválido muestra error y permite reintentar", async ({ browser }) => {
  const a = await open(browser);
  const b = await open(browser);
  const alias = `Zoe-${suffix()}`;
  await enter(a, alias);
  await inRoom(a, alias);

  await enter(b, alias.toLowerCase());
  await expect(b.getByTestId("alias-error")).toContainText("ya está en uso");
  await expect(b.getByLabel("Tu nombre")).toBeEnabled();
  await expect(b.getByLabel("Tu nombre")).toHaveAttribute("aria-invalid", "true");
  await expect(b.getByTestId("room-screen")).toHaveCount(0);

  await enter(b, "x");
  await expect(b.getByTestId("alias-error")).toContainText("no es válido");

  const other = `Bob-${suffix()}`;
  await enter(b, other);
  await inRoom(b, other);
  await inRoom(a, alias);
});

test("E2E-3: al salir el alias queda libre para otro contexto", async ({ browser }) => {
  const a = await open(browser);
  const b = await open(browser);
  const alias = `Eve-${suffix()}`;
  await enter(a, alias);
  await inRoom(a, alias);

  await enter(b, alias);
  await expect(b.getByTestId("alias-error")).toContainText("ya está en uso");

  await a.getByRole("button", { name: "Salir" }).click();
  await expect(a.getByTestId("entry-screen")).toBeVisible();
  await expect(a.getByTestId("session-notice")).toHaveCount(0);

  await enter(b, alias);
  await inRoom(b, alias);
});

test("E2E-4: recargar la pestaña conserva el alias sin pedirlo de nuevo", async ({ browser }) => {
  const a = await open(browser);
  const b = await open(browser);
  const alias = `Dan-${suffix()}`;
  await enter(a, alias);
  await inRoom(a, alias);

  await a.reload();
  await inRoom(a, alias);
  await expect(a.getByTestId("entry-screen")).toHaveCount(0);

  // El alias sigue reservado para los demás.
  await enter(b, alias);
  await expect(b.getByTestId("alias-error")).toContainText("ya está en uso");
});

test("E2E-5: un token que ya no vale devuelve a la entrada con aviso", async ({ browser }) => {
  const a = await open(browser);
  const alias = `Kim-${suffix()}`;
  await enter(a, alias);
  await inRoom(a, alias);

  await a.evaluate(() => sessionStorage.setItem("pw.sessionToken", "token-que-no-existe"));
  await a.reload();
  await expect(a.getByTestId("session-notice")).toContainText("Tu sesión expiró");
  await expect(a.getByTestId("room-screen")).toHaveCount(0);
  await expect(a.getByRole("button", { name: "Entrar" })).toBeEnabled();
  expect(await a.evaluate(() => sessionStorage.getItem("pw.sessionToken"))).toBeNull();
});
