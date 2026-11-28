import { expect, test, type Page } from "@playwright/test";

async function seedApplicantRoute(page: Page, completeGeneral: boolean = false) {
  await page.addInitScript((generalComplete) => {
    localStorage.setItem("t4sc-application-reference", "QA-ONLY-NOT-A-REAL-APPLICATION");
    localStorage.setItem("t4sc-application-email", "playwright.qa@example.com");
    localStorage.setItem(
      "t4sc-application-route",
      JSON.stringify({
        primaryDepartment: "AI & Machine Learning",
        experienceLevel: "Beginner",
      })
    );
    if (generalComplete) {
      localStorage.setItem("t4sc-general-screening-complete", "true");
    }
  }, completeGeneral);
}

test("public home page loads", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("application form requires a signed-in applicant account", async ({ page }) => {
  await page.goto("/apply");
  await expect(page).toHaveURL(/applicant-access\?next=%2Fapply/);
  await expect(page.getByRole("button", { name: "Create account", exact: true })).toBeVisible();
});

test("common screening stage renders questions and written responses", async ({ page }) => {
  await seedApplicantRoute(page);
  await page.goto("/screening/general");
  await expect(page.getByRole("heading", { name: /Think it through/i })).toBeVisible();
  await expect(page.locator(".question-card")).toHaveCount(6);
  await expect(page.locator(".written-section textarea")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Start general screening/i })).toBeVisible();
});

test("department screening stage renders the selected route", async ({ page }) => {
  await seedApplicantRoute(page, true);
  await page.goto("/screening/department");
  await expect(page.getByRole("heading", { name: /Your chosen path/i })).toBeVisible();
  await expect(page.getByText("AI & Machine Learning").first()).toBeVisible();
  await expect(page.locator(".question-card")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /Start department assessment/i })).toBeVisible();
});

test("private status API rejects an unauthenticated browser request", async ({ request }) => {
  const response = await request.post("/api/applications/status", {
    data: { reference: "T4SC-TESTONLY", email: "playwright.qa@example.com" },
  });
  expect(response.status()).toBe(401);
});

test("reviewer API rejects an unauthenticated browser request", async ({ request }) => {
  const response = await request.post("/api/reviewer", {
    data: { action: "note", reference: "T4SC-TESTONLY", note: "QA test only; must not be saved." },
  });
  expect(response.status()).toBe(401);
});

test("public admissions guide does not publish unvalidated scores or pass bands", async ({ page }) => {
  await page.goto("/admissions");
  await expect(page.getByRole("heading", { name: /Potential over/i })).toBeVisible();
  await expect(page.getByText(/70–100/)).toHaveCount(0);
  await expect(page.getByText(/55–69/)).toHaveCount(0);
  await expect(page.getByText(/35 points/)).toHaveCount(0);
  await expect(page.getByText(/full scoring rubrics are still under validation/i)).toBeVisible();
});

test("Learning Potential is clearly marked as not yet enabled", async ({ page }) => {
  await page.goto("/assessments");
  await expect(page.getByRole("heading", { name: /Learning potential component/i })).toBeVisible();
  await expect(page.getByText(/Under validation — not currently enabled/i)).toBeVisible();
});
