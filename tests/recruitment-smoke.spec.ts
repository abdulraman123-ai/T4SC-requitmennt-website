import { expect, test } from "@playwright/test";

test("public home page loads", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("application form keeps its existing fields and omits weekly-hours question", async ({ page }) => {
  await page.goto("/apply");

  await page.getByPlaceholder("What should we call you?").fill("Playwright QA Applicant");
  await page.getByPlaceholder("you@example.com").fill("playwright.qa@example.com");
  await page.getByPlaceholder("Country you are based in").fill("Türkiye");
  await page.getByPlaceholder("State, region or city").fill("Istanbul");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("combobox").nth(0).selectOption({ label: "AI & Machine Learning" });
  await page.getByPlaceholder("What draws you to this area? What would you like to explore?").fill(
    "I want to learn how responsible machine-learning systems can solve practical problems."
  );
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("combobox").nth(0).selectOption({ label: "Beginner" });
  await page.getByPlaceholder(
    "Tell us about something you have tried, learned or built — or say you are just starting."
  ).fill("I am starting as a beginner and I am ready to learn.");
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByPlaceholder("What would you like to learn, and what do you hope to contribute?").fill(
    "I want to learn with a team, practise problem solving and build useful skills."
  );
  await page.getByPlaceholder("It can be a small everyday problem. Explain why it matters to you.").fill(
    "I would like to make access to useful learning resources easier."
  );
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Select the time you can realistically give")).toHaveCount(0);
  await expect(
    page.getByText("Can you attend scheduled sessions or collaborate with a team?")
  ).toBeVisible();
  await expect(page.getByText("What device can you access?")).toBeVisible();
  await expect(page.getByText("How reliable is your internet access?")).toBeVisible();

  // Deliberately do not submit the application or create a database record.
});

test("common screening stage renders its questions and written responses", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("t4sc-application-reference", "QA-ONLY-NOT-A-REAL-APPLICATION");
    localStorage.setItem("t4sc-application-email", "playwright.qa@example.com");
    localStorage.setItem(
      "t4sc-application-route",
      JSON.stringify({
        primaryDepartment: "AI & Machine Learning",
        experienceLevel: "Beginner",
      })
    );
  });

  await page.goto("/screening/general");

  await expect(page.getByRole("heading", { name: /Think it through/i })).toBeVisible();
  await expect(page.locator(".question-card")).toHaveCount(6);
  await expect(page.locator(".written-section textarea")).toHaveCount(3);

  // The test only inspects the page; it never submits screening answers.
});

test("department screening stage follows the common screening stage", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("t4sc-application-reference", "QA-ONLY-NOT-A-REAL-APPLICATION");
    localStorage.setItem("t4sc-application-email", "playwright.qa@example.com");
    localStorage.setItem(
      "t4sc-application-route",
      JSON.stringify({
        primaryDepartment: "AI & Machine Learning",
        experienceLevel: "Beginner",
      })
    );
    localStorage.setItem("t4sc-general-screening-complete", "true");
  });

  await page.goto("/screening/department");

  await expect(page.getByRole("heading", { name: /Your chosen path/i })).toBeVisible();
  await expect(page.getByText("AI & Machine Learning").first()).toBeVisible();
  await expect(page.locator(".question-card")).toHaveCount(3);

  // The test only inspects the page; it never submits department answers.
});
