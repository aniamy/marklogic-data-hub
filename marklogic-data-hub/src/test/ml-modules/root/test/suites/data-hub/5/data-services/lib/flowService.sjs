function invoke(module, args) {
  return fn.head(xdmp.invoke("/data-hub/5/data-services/flow/" + module, args));
}

function addStepToFlow(flowName, stepDefinitionType, stepName) {
  return invoke("addStepToFlow.mjs", {flowName, stepDefinitionType, stepName});
}

function deleteFlow(name) {
  return invoke("deleteFlow.mjs", {name});
}

function createFlow(name, description) {
  return invoke("createFlow.mjs", {name, description});
}

function getFlow(name) {
  return invoke("getFlow.mjs", {name});
}

function getFlowsWithStepDetails() {
  return invoke("getFlowsWithStepDetails.mjs", {});
}

function getFlowWithLatestJobInfo(name) {
  return invoke("getFlowWithLatestJobInfo.sjs", {name});
}

function getFlowsWithLatestJobInfo(name) {
  return invoke("getFlowsWithLatestJobInfo.sjs", {});
}

function getFullFlow(flowName) {
  return invoke("getFullFlow.sjs", {flowName});
}

function removeStepFromFlow(flowName, stepNumber) {
  return invoke("removeStepFromFlow.sjs", {flowName, stepNumber});
}

function updateFlow(name, description, stepIds) {
  return invoke("updateFlow.sjs", {name, description, stepIds});
}

module.exports = {
  addStepToFlow,
  createFlow,
  deleteFlow,
  getFlow,
  getFlowsWithStepDetails,
  getFullFlow,
  removeStepFromFlow,
  updateFlow,
  getFlowWithLatestJobInfo,
  getFlowsWithLatestJobInfo
};
