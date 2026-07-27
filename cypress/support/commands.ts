// cypress/support/commands.ts
/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      dataTestId(value: string): Chainable<JQuery<HTMLElement>>
      login(email: string, password: string): Chainable<void>
      logout(): Chainable<void>
    }
  }
}

Cypress.Commands.add("dataTestId", (value: string) =>
  cy.get(`[data-testid="${value}"]`),
)

Cypress.Commands.add(
  "login",
  (email: string, password: string) => {
    cy.visit("/auth/sign-in")
    cy.dataTestId("email-input").type(email)
    cy.dataTestId("password-input").type(password)
    cy.dataTestId("sign-in-button").click()
    cy.url().should("include", "/dashboard")
  },
)

Cypress.Commands.add("logout", () => {
  // TODO: requires data-testid="user-menu" + data-testid="logout-button"
  // on the respective UI elements (not yet added in Phase 0).
  cy.dataTestId("user-menu").click()
  cy.dataTestId("logout-button").click()
  cy.url().should("include", "/auth/sign-in")
})