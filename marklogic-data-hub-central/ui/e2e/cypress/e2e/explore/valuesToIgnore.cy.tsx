import LoginPage from "../../support/pages/login";
import curatePage from "../../support/pages/curate";
import graphExplore from "../../support/pages/graphExplore";
import explorePage from "../../support/pages/explore";
import runPage from "../../support/pages/run";
import { rulesetSingleModal } from "../../support/components/matching";
import { find } from "cypress/types/lodash";

describe("Verify values to ignore feature", () => {

  before(() => {
    cy.clearAllLocalStorage()
    cy.clearAllSessionStorage()
    cy.loginAsTestUserWithRoles("hub-central-flow-writer", "hub-central-match-merge-writer", "hub-central-mapping-writer", "hub-central-load-writer").withRequest();
    LoginPage.navigateToMainPage();
  });

  it("Should merge when values do not match", () => {
    cy.visit("/tiles/run");
    cy.waitForAsyncRequest();

    runPage.toggleExpandFlow("testValuesToIgnore");
    runPage.getRunFlowButton("testValuesToIgnore").click()
    cy.uploadFile("input/valuesToIgnore/values-to-ignore1.json");
    cy.uploadFile("input/valuesToIgnore/values-to-ignore2.json");
    cy.uploadFile("input/valuesToIgnore/values-to-ignore3.json");
    cy.uploadFile("input/valuesToIgnore/values-to-ignore4.json");
    cy.waitForAsyncRequest();
    cy.findByTestId("mergeForValuesToIgnore-success", { timeout: 12000 }).should("be.visible")
    runPage.explorerLink("mergeForValuesToIgnore").click()
    cy.wait(13000)
    cy.get("#switch-view-table").click({force: true});
    cy.findAllByText("Robert,Bob") 
    cy.findAllByText("Marge,Margot") 
    cy.findAllByTestId("unmergeIcon").should("have.length",2)
  });

  it("Should not merge when values do match with one list", () => {
    cy.visit("/tiles/curate");
    cy.waitForAsyncRequest();

    // create a new values to ignore list
    curatePage.toggleEntityTypeId("Person");
    curatePage.selectMatchTab("Person");
    curatePage.openStepDetails("matchForValuesToIgnore"); 
    cy.findByLabelText("ruleset-scale-switch").click();
    cy.wait(1000);
    cy.findAllByText("lname - Exact").eq(1).click({force:true});    
    rulesetSingleModal.selectValuesToIgnoreInput();
    rulesetSingleModal.createNewList();
    rulesetSingleModal.addListTitle("values-to-ignore-input", "IgnoreGonzales");
    rulesetSingleModal.addValuesToListToIgnore("Gonzales");
    rulesetSingleModal.saveModalButton("confirm-list-ignore");
    cy.findByText("IgnoreGonzales").click();
    rulesetSingleModal.saveButton().click()

    graphExplore.getRunTile().click();
    cy.waitForAsyncRequest();
    runPage.toggleExpandFlow("testValuesToIgnore");
    runPage.openStepsSelectDropdown("testValuesToIgnore")
    runPage.clickStepInsidePopover("#loadValuesToIgnore")
    runPage.clickStepInsidePopover("#mapForValuesToIgnore")
    runPage.getRunFlowButton("testValuesToIgnore").click()
    cy.waitForAsyncRequest()
    cy.findByTestId("mergeForValuesToIgnore-success", { timeout: 12000 }).should("be.visible")
    runPage.explorerLink("mergeForValuesToIgnore").click()
    cy.findByText("Robert,Bob").should("not.exist")
    cy.findByText("Marge,Margot").should("exist")
  });

  it("Should not merge when values do match with multiple lists", () => {
    cy.visit("/tiles/curate");
    cy.waitForAsyncRequest();

    // create a new values to ignore list
    curatePage.toggleEntityTypeId("Person");
    curatePage.selectMatchTab("Person");
    curatePage.openStepDetails("matchForValuesToIgnore"); 
    cy.findByLabelText("ruleset-scale-switch").click();
    cy.wait(1000);
    cy.findAllByText("lname - Exact").eq(1).click({force:true});    
    rulesetSingleModal.selectValuesToIgnoreInput();
    rulesetSingleModal.createNewList();
    rulesetSingleModal.addListTitle("values-to-ignore-input", "IgnoreSimpson");
    rulesetSingleModal.addValuesToListToIgnore("Simpson");
    rulesetSingleModal.saveModalButton("confirm-list-ignore");
    cy.findByText("IgnoreSimpson").click();
    rulesetSingleModal.saveButton().click()
    
    // Run match and merge
    graphExplore.getRunTile().click();
    cy.waitForAsyncRequest();
    runPage.toggleExpandFlow("testValuesToIgnore");
    runPage.getRunFlowButton("testValuesToIgnore").click()
    cy.waitForAsyncRequest()
    cy.findByTestId("mergeForValuesToIgnore-success", { timeout: 12000 }).should("be.visible")
    runPage.explorerLink("mergeForValuesToIgnore").click()
    cy.waitForAsyncRequest();
    explorePage.getEntities().click()
    cy.get("#switch-view-table").click({force: true});

    cy.findByText("Robert,Bob").should("not.exist")
    cy.findByText("Marge,Margot").should("not.exist")
  });
});
