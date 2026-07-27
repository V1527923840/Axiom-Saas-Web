// cypress/e2e/auth/sign-in.cy.ts
describe("Auth — Sign In", () => {
  it("rejects invalid credentials", () => {
    cy.visit("/auth/sign-in")
    cy.dataTestId("email-input").type("wrong@example.com")
    cy.dataTestId("password-input").type("wrong-password")
    cy.dataTestId("sign-in-button").click()
    cy.dataTestId("error-message").should("be.visible")
    cy.url().should("include", "/auth/sign-in")
  })

  it("accepts valid credentials and lands on dashboard", () => {
    // Assumes server is running with seeded test users.
    // Run locally with: pnpm dev (and backend up), then:
    //   pnpm cypress run --spec cypress/e2e/auth/sign-in.cy.ts
    cy.login("admin@example.com", "password")
    cy.url().should("include", "/dashboard")
  })
})
