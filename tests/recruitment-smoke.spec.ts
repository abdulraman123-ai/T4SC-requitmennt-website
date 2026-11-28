import { expect, test } from "@playwright/test";

test("public home page loads", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("application form requires a signed-in applicant account", async ({ page }) => {
  await page.goto("/apply");
  await expect(page).toHaveURL(/applicant-access\?next=%2Fapply/);
  await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
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
