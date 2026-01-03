/**
 * Cypressの画面起動確認を行う。
 * @file
 */
const { getGoogleMapsStubScript } = require("../../tests/helpers/google-maps-stub");

// stubGoogleMapsの処理を定義する。
const stubGoogleMaps = () => {
  cy.intercept(
    "GET",
    /https:\/\/maps\.googleapis\.com\/maps\/api\/js.*/,
    {
      statusCode: 200,
      body: getGoogleMapsStubScript(),
      headers: {
        "content-type": "application/javascript",
      },
    }
  );
};

describe("トップページ", () => {
  beforeEach(() => {
    stubGoogleMaps();
    cy.visit("/");
    cy.get("#statusCard").should("have.attr", "data-state", "ready");
  });

  it("主要なUIが表示される", () => {
    cy.contains("ライブマップコンソール");
    cy.get("#map").should("be.visible");
    cy.get("#recommendForm").should("be.visible");
    cy.get("#keyStatus").should("have.text", "準備完了");
  });

  it("地域選択は排他になる", () => {
    cy.get("#originAreaSelect").select("関東地方");
    cy.get("#originAreaSelect").should("have.value", "関東地方");
    cy.get("#originRegionSelect").should("have.value", "");

    cy.get("#originRegionSelect").select("東京都");
    cy.get("#originRegionSelect").should("have.value", "東京都");
    cy.get("#originAreaSelect").should("have.value", "");
  });

  it("所要時間のヒントが更新される", () => {
    cy.get("#maxTimeInput").clear().type("30");
    cy.get("#limitHint").should("contain.text", "30分");

    cy.get("#maxTimeInput").clear();
    cy.get("#limitHint").should("contain.text", "未入力なら制限なし");
  });
});
