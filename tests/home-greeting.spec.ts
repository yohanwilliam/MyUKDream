import { expect, test, type Page } from '@playwright/test';
import {
  baseURL,
  firstName,
  homeGoal,
  homeGreeting,
  optionValue,
  primaryCredentials,
  readPlan,
  savePlan,
  secondCredentials,
  signInStudent,
  withSignedInStudent,
  withTemporaryPlan,
} from './support';

const credentials = () => primaryCredentials();
const hours = {
  morning: '2026-11-04T03:00:00.000Z',
  afternoon: '2026-11-04T09:00:00.000Z',
  evening: '2026-11-04T14:00:00.000Z',
};

async function greetingAt(page: Page, timeOfDay: string): Promise<void> {
  const profile = await readPlan(page);
  await page.goto('/');
  await expect(await homeGreeting(page)).toBe(`Good ${timeOfDay}, ${firstName(profile.fullName)}`);
}

test.describe('SCRUM-84 | Home greeting and goal line', () => {
  test('TC-01 displays the morning greeting in the display font', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {
      time: hours.morning,
      timezoneId: 'Asia/Kolkata',
    }, async (page) => {
      await greetingAt(page, 'morning');
      const family = await page.getByRole('heading', { level: 1 }).evaluate(
        (element) => getComputedStyle(element).fontFamily,
      );
      expect(family).toContain('Fraunces');
    });
  });

  test('TC-02 displays the afternoon greeting in the display font', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {
      time: hours.afternoon,
      timezoneId: 'Asia/Kolkata',
    }, async (page) => {
      await greetingAt(page, 'afternoon');
      const family = await page.getByRole('heading', { level: 1 }).evaluate(
        (element) => getComputedStyle(element).fontFamily,
      );
      expect(family).toContain('Fraunces');
    });
  });

  test('TC-03 displays the evening greeting in the display font', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {
      time: hours.evening,
      timezoneId: 'Asia/Kolkata',
    }, async (page) => {
      await greetingAt(page, 'evening');
      const family = await page.getByRole('heading', { level: 1 }).evaluate(
        (element) => getComputedStyle(element).fontFamily,
      );
      expect(family).toContain('Fraunces');
    });
  });

  test('TC-04 greets the first name on the student profile', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      const profile = await readPlan(page);
      await page.goto('/');
      expect(await homeGreeting(page)).toMatch(
        new RegExp(`^Good (morning|afternoon|evening), ${escapeRegExp(firstName(profile.fullName))}$`),
      );
    });
  });

  test('TC-05 handles a missing or empty first name without malformed text', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      const original = await readPlan(page);
      let profileWasChanged = false;
      try {
        await page.goto('/settings');
        const name = page.getByLabel('Full name');
        await name.fill('');
        const valid = await name.evaluate((element) => (element as HTMLInputElement).checkValidity());

        if (valid) {
          profileWasChanged = true;
          await savePlan(page, { ...original, fullName: '' });
        } else {
          expect(
            await name.evaluate((element) => (element as HTMLInputElement).validity.valueMissing),
            'The profile form should reject an empty required name',
          ).toBeTruthy();
        }

        await page.goto('/');
        const greeting = await homeGreeting(page);
        expect(greeting).not.toMatch(/null|undefined/i);
        expect(greeting).not.toMatch(/,\s*$/);
        expect(greeting).toMatch(/^Good (morning|afternoon|evening)(, .+)?$/);
      } finally {
        if (profileWasChanged) await savePlan(page, original);
        await page.goto('/');
      }
    });
  });

  test('TC-06 reflects a profile first-name update', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => ({
        ...original,
        fullName: 'Aisha Teststudent',
      }), async () => {
        expect(await homeGreeting(page)).toMatch(/^Good (morning|afternoon|evening), Aisha$/);
      });
    });
  });

  test('TC-07 shows a personalized goal directly below the greeting', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      const greeting = page.getByRole('heading', { level: 1 });
      const goal = page.locator('main p').first();
      await expect(greeting).toBeVisible();
      await expect(goal).toBeVisible();
      expect((await goal.innerText()).trim()).not.toBe('');
      const greetingBox = await greeting.boundingBox();
      const goalBox = await goal.boundingBox();
      if (!greetingBox || !goalBox) throw new Error('Greeting or goal has no rendered layout box.');
      expect(goalBox.y).toBeGreaterThanOrEqual(greetingBox.y + greetingBox.height);
    });
  });

  test('TC-08 reflects course level and intended start date in the goal', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => ({
        ...original,
        level: await optionValue(page, 'Level', "Master's"),
        courseStart: await optionValue(page, 'Course start', 'September 2027'),
      }), async () => {
        const goal = await homeGoal(page);
        expect(goal).toContain("master's");
        expect(goal).toContain('September 2027');
      });
    });
  });

  test('TC-09 reflects the current-student journey goal', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => ({
        ...original,
        stage: await optionValue(page, 'Where you are now', 'Studying in the UK'),
      }), async () => {
        expect(await homeGoal(page)).toBe("You're studying in the UK.");
      });
    });
  });

  test('TC-10 reflects a graduate journey goal', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => ({
        ...original,
        stage: await optionValue(page, 'Where you are now', 'Graduated, looking for a job'),
      }), async () => {
        expect(await homeGoal(page)).toBe("You've graduated and you're working towards a sponsored job.");
      });
    });
  });

  test('TC-11 reflects a graduate employment goal of a sponsored job', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => ({
        ...original,
        stage: await optionValue(page, 'Where you are now', 'Graduated, looking for a job'),
      }), async () => {
        expect(await homeGoal(page)).toMatch(/graduated.*working towards a sponsored job/i);
      });
    });
  });

  test('TC-12 reflects the selected Bachelor’s or Master’s course level', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => original, async () => {
        for (const [label, expected] of [["Bachelor's", "bachelor's"], ["Master's", "master's"]]) {
          const current = await readPlan(page);
          await savePlan(page, {
            ...current,
            level: await optionValue(page, 'Level', label),
            courseStart: await optionValue(page, 'Course start', 'September 2027'),
          });
          await page.goto('/');
          expect(await homeGoal(page)).toContain(expected);
        }
      });
    });
  });

  test('TC-13 reflects every supported intended course start month and year', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => original, async () => {
        await readPlan(page);
        const start = page.getByLabel('Course start');
        const available = (await start.locator('option').allTextContents())
          .map((option) => option.trim())
          .filter((option) => option !== 'Not sure yet');
        expect(available.length).toBeGreaterThan(0);

        for (const date of available) {
          const current = await readPlan(page);
          await savePlan(page, {
            ...current,
            courseStart: await optionValue(page, 'Course start', date),
          });
          await page.goto('/');
          expect(await homeGoal(page)).toContain(date);
        }
      });
    });
  });

  test('TC-14 places the greeting above the goal and aligns both elements', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      const greeting = page.getByRole('heading', { level: 1 });
      const goal = page.locator('main p').first();
      const greetingBox = await greeting.boundingBox();
      const goalBox = await goal.boundingBox();
      if (!greetingBox || !goalBox) throw new Error('Greeting or goal has no rendered layout box.');
      expect(goalBox.y).toBeGreaterThanOrEqual(greetingBox.y + greetingBox.height);
      expect(Math.abs(goalBox.x - greetingBox.x)).toBeLessThanOrEqual(1);
    });
  });

  test('TC-15 uses the intended display-font size, weight, and styling', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      const styles = await page.getByRole('heading', { level: 1 }).evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          family: style.fontFamily,
          size: Number.parseFloat(style.fontSize),
          weight: Number.parseInt(style.fontWeight, 10),
        };
      });
      expect(styles.family).toContain('Fraunces');
      expect(styles.size).toBeGreaterThanOrEqual(32);
      expect(styles.weight).toBeGreaterThanOrEqual(400);
      expect(styles.weight).toBeLessThanOrEqual(700);
    });
  });

  test('TC-16 keeps long greeting and goal text readable without clipping', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => ({
        ...original,
        fullName: 'Alexandria-Catherine-Wellington-Montgomery-Fitzgerald-Buckingham Student',
        level: await optionValue(page, 'Level', "Master's"),
        courseStart: await optionValue(page, 'Course start', 'September 2029'),
      }), async () => {
        const metrics = await page.getByRole('heading', { level: 1 }).evaluate((element) => ({
          text: element.textContent ?? '',
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          overflow: getComputedStyle(element).textOverflow,
        }));
        const goalMetrics = await page.locator('main p').first().evaluate((element) => ({
          text: element.textContent ?? '',
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          overflow: getComputedStyle(element).textOverflow,
        }));
        expect(metrics.text).toContain('Alexandria-Catherine');
        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
        expect(metrics.overflow).not.toBe('ellipsis');
        expect(goalMetrics.text).toContain('September 2029');
        expect(goalMetrics.scrollWidth).toBeLessThanOrEqual(goalMetrics.clientWidth);
        expect(goalMetrics.overflow).not.toBe('ellipsis');
      });
    });
  });

  test('TC-17 adapts the greeting and goal to desktop, tablet, and mobile widths', async ({ browser }) => {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await withSignedInStudent(browser, credentials(), { viewport }, async (page) => {
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(page.locator('main p').first()).toBeVisible();
        const dimensions = await page.evaluate(() => ({
          viewport: window.innerWidth,
          document: document.documentElement.scrollWidth,
        }));
        expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
      });
    }
  });

  test('TC-18 preserves personalized greeting and goal after a refresh', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      const before = { greeting: await homeGreeting(page), goal: await homeGoal(page) };
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(before.greeting);
      await expect(page.locator('main p').first()).toHaveText(before.goal);
    });
  });

  test('TC-19 replaces prior-student information after signing in as another student', async ({ browser }) => {
    const otherStudent = secondCredentials();
    test.skip(!otherStudent, 'Configure a distinct TEST_USER_TWO_EMAIL/TEST_USER_TWO_PASSWORD account.');
    if (!otherStudent) return;
    const firstStudent = credentials();
    expect(otherStudent.email.toLowerCase()).not.toBe(firstStudent.email.toLowerCase());
    const context = await browser.newContext({ baseURL });
    try {
      const page = await context.newPage();
      await signInStudent(page, firstStudent);
      const previousProfile = await readPlan(page);
      await page.goto('/');
      const previousGoal = await homeGoal(page);
      await page.goto('/settings');
      await page.getByRole('button', { name: 'Sign out' }).click();
      await page.waitForURL(/\/login/);

      await signInStudent(page, otherStudent);
      const profile = await readPlan(page);
      await page.goto('/');
      const greeting = await homeGreeting(page);
      const goal = await homeGoal(page);
      const currentFirstName = firstName(profile.fullName);
      const previousFirstName = firstName(previousProfile.fullName);
      expect(currentFirstName.toLowerCase()).not.toBe(previousFirstName.toLowerCase());
      expect(greeting.toLowerCase()).toContain(currentFirstName.toLowerCase());
      expect(greeting.toLowerCase()).not.toContain(previousFirstName.toLowerCase());
      expect(goal).not.toBe('');
      expect(goal).not.toBe(previousGoal);
    } finally {
      await context.close();
    }
  });

  test('TC-20 shows an appropriate personalized goal for each early journey stage', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => ({
        ...original,
        level: await optionValue(page, 'Level', "Bachelor's"),
        courseStart: await optionValue(page, 'Course start', 'September 2027'),
      }), async () => {
        const stages = [
          'Thinking about studying in the UK',
          'Applying to universities',
          'Have an offer, sorting my visa',
        ];
        for (const label of stages) {
          const current = await readPlan(page);
          await savePlan(page, {
            ...current,
            stage: await optionValue(page, 'Where you are now', label),
          });
          await page.goto('/');
          const goal = await homeGoal(page);
          expect(goal).toBe("You're preparing to start a bachelor's in the UK in September 2027.");
        }

        const current = await readPlan(page);
        await savePlan(page, {
          ...current,
          stage: await optionValue(page, 'Where you are now', 'Studying in the UK'),
        });
        await page.goto('/');
        expect(await homeGoal(page)).toBe("You're studying in the UK.");
      });
    });
  });

  test('TC-21 offers supported higher-education levels and reflects each selection', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => original, async () => {
        await readPlan(page);
        const level = page.getByLabel('Level');
        const options = (await level.locator('option').allTextContents())
          .map((option) => option.trim());
        expect(options).toContain("Bachelor's");
        expect(options).toContain("Master's");
        test.info().annotations.push({
          type: 'note',
          description: options.some((option) => /ph\.?d|doctorate/i.test(option))
            ? 'The UI exposes PhD/Doctorate; it is checked below.'
            : 'The current UI does not expose PhD/Doctorate; no product requirement was provided for it.',
        });

        const doctoral = options.find((option) => /ph\.?d|doctorate/i.test(option));
        const levels = ["Bachelor's", "Master's", ...(doctoral ? [doctoral] : [])];
        for (const label of levels) {
          const current = await readPlan(page);
          await savePlan(page, {
            ...current,
            level: await optionValue(page, 'Level', label),
            courseStart: await optionValue(page, 'Course start', 'September 2027'),
          });
          await page.goto('/');
          const goal = (await homeGoal(page)).toLowerCase();
          expect(goal).toContain(label.toLowerCase().replace(/^phd$/, 'phd'));
        }
      });
    });
  });

  test('TC-22 capitalizes a lowercase first-name initial in the greeting', async ({ browser }) => {
    await withSignedInStudent(browser, credentials(), {}, async (page) => {
      await withTemporaryPlan(page, async (original) => ({
        ...original,
        fullName: 'aisha teststudent',
      }), async () => {
        expect(await homeGreeting(page)).toMatch(/^Good (morning|afternoon|evening), Aisha$/);
      });
    });
  });
});

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
