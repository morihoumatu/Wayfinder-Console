/**
 * Cypressの画面起動確認を行う。
 * @file
 */
describe("トップページ", () => {
  it("主要なUIが表示される", () => {
    cy.visit("/");
    cy.contains("ライブマップコンソール");
    cy.get("#map").should("be.visible");
    cy.get("#recommendForm").should("be.visible");
  });
});
