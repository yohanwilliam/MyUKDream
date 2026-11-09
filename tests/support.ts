import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export interface StudentCredentials {
  email: string;
  password: string;
}

export interface PlanState {
  fullName: string;
  stage: string;
  courseStart: string;
  level: string;
  subject: string;
}

export interface PageOptions {
  time?: string;
  timezoneId?: string;
  viewport?: { width: number; height: number };
}

export const baseURL = process.env.BASE_URL ?? 'https://app.myukdream.com';
type BrowserStorageState = Awaited<ReturnType<BrowserContext['storageState']>>;
const storageStates = new Map<string, Promise<BrowserStorageState>>();

export function primaryCredentials(): StudentCredentials {
  return {
    email: requiredEnv('TEST_EMAIL'),
    password: requiredEnv('TEST_PASSWORD'),
  };
}

export function secondCredentials(): StudentCredentials | undefined {
  const email = process.env.TEST_USER_TWO_EMAIL;
  const password = process.env.TEST_USER_TWO_PASSWORD;
  if (!email && !password) return undefined;
  if (!email || !password) {
    throw new Error('Set both TEST_USER_TWO_EMAIL and TEST_USER_TWO_PASSWORD to run TC-19.');
  }
  return { email, password };
}

export async function withSignedInStudent(
  browser: Browser,
  credentials: StudentCredentials,
  options: PageOptions,
  run: (page: Page) => Promise<void>,
): Promise<void> {
  const storageState = await getStorageState(browser, credentials);
  const context = await browser.newContext({
    baseURL,
    timezoneId: options.timezoneId,
    viewport: options.viewport,
    storageState,
  });
  const page = await context.newPage();

  try {
    if (options.time) {
      await page.clock.install({ time: new Date(options.time) });
    }
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      /^Good (morning|afternoon|evening), /,
    );
    await run(page);
  } finally {
    if (!page.isClosed()) await context.close();
  }
}

export async function signInStudent(page: Page, credentials: StudentCredentials): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(credentials.email);
  await page.getByRole('textbox', { name: 'Password' }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

export async function readPlan(page: Page): Promise<PlanState> {
  await page.goto('/settings');
  return {
    fullName: await page.getByLabel('Full name').inputValue(),
    stage: await page.getByLabel('Where you are now').inputValue(),
    courseStart: await page.getByLabel('Course start').inputValue(),
    level: await page.getByLabel('Level').inputValue(),
    subject: await page.getByLabel('Subject').inputValue(),
  };
}

export async function savePlan(page: Page, state: PlanState): Promise<void> {
  if (
    new URL(baseURL).hostname === 'app.myukdream.com' &&
    process.env.ALLOW_LIVE_MUTATIONS !== '1'
  ) {
    throw new Error('Set ALLOW_LIVE_MUTATIONS=1 to run profile-changing tests on the live app.');
  }

  await page.goto('/settings');
  await page.getByLabel('Full name').fill(state.fullName);
  await page.getByLabel('Where you are now').selectOption(state.stage);
  await page.getByLabel('Course start').selectOption(state.courseStart);
  await page.getByLabel('Level').selectOption(state.level);
  await page.getByLabel('Subject').fill(state.subject);

  const profileURL = new URL('/api/profile', baseURL).href;
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.url() === profileURL && candidate.request().method() === 'POST',
    ),
    page.getByRole('button', { name: 'Save changes' }).click(),
  ]);
  expect(response.ok(), 'Saving the student profile should succeed').toBeTruthy();
}

export async function withTemporaryPlan(
  page: Page,
  buildNext: (original: PlanState) => Promise<PlanState>,
  run: (updated: PlanState) => Promise<void>,
): Promise<void> {
  const original = await readPlan(page);
  try {
    const updated = await buildNext(original);
    if (JSON.stringify(updated) !== JSON.stringify(original)) {
      await savePlan(page, updated);
    }
    await page.goto('/');
    await run(updated);
  } finally {
    await savePlan(page, original);
    await page.goto('/');
  }
}

export async function optionValue(
  page: Page,
  label: string,
  optionLabel: string,
): Promise<string> {
  const select = page.getByLabel(label);
  const value = await select.locator('option').evaluateAll((options, text) => {
    const option = options.find((candidate) => candidate.textContent?.trim() === text);
    return option?.value ?? null;
  }, optionLabel);
  if (value === null) {
    throw new Error(`The "${label}" control does not offer "${optionLabel}".`);
  }
  return value;
}

export async function homeGreeting(page: Page): Promise<string> {
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
  return heading.innerText();
}

export async function homeGoal(page: Page): Promise<string> {
  const goal = page.locator('main p').first();
  await expect(goal).toBeVisible();
  return goal.innerText();
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name} in the local .env file before running the browser tests.`);
  }
  return value;
}

async function getStorageState(
  browser: Browser,
  credentials: StudentCredentials,
): Promise<BrowserStorageState> {
  const existing = storageStates.get(credentials.email);
  if (existing) return existing;

  const statePromise = (async () => {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    try {
      await signInStudent(page, credentials);
      return await context.storageState();
    } finally {
      if (!page.isClosed()) await context.close();
    }
  })();
  storageStates.set(credentials.email, statePromise);
  return statePromise;
}
