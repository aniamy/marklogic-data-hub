import entityValidationLib from "/data-hub/5/builtins/steps/mapping/entity-services/entity-validation-lib.mjs";
const test = require("/test/test-helper.xqy");

function shouldValidate(validateEntityValue) {
  return entityValidationLib.shouldValidateEntity({
    validateEntity: validateEntityValue
  });
}

function updateGlobalConfigFile(value) {
  const content = {
    "entityValidation": value
  };
  xdmp.invokeFunction(() => {
    xdmp.documentInsert("/config/globalSettings.json", content,
      {
        permissions: xdmp.defaultPermissions(),
      })
  }, { update: "true" });
}

const assertions = [
  test.assertFalse(shouldValidate(null), "No values so we should return false"),
  test.assertFalse(shouldValidate(undefined), "No values so we should return false")
];

updateGlobalConfigFile("accept");

assertions.concat([
  test.assertTrue(shouldValidate("accept")),
  test.assertTrue(shouldValidate("ACCEPT")),
  test.assertTrue(shouldValidate("reject")),
  test.assertTrue(shouldValidate("REJECT")),
  test.assertTrue(shouldValidate(null), "Null value should return true because global is set to accept"),
  test.assertTrue(shouldValidate(undefined), "Undefined value should return true because global is set to accept"),
  test.assertFalse(shouldValidate("doNotValidate")),
  test.assertFalse(shouldValidate(false)),
  test.assertFalse(shouldValidate("false")),
  test.assertFalse(shouldValidate(true)),
  test.assertFalse(shouldValidate("true"))
]);

updateGlobalConfigFile("reject");

assertions.concat([
  test.assertTrue(shouldValidate("accept")),
  test.assertTrue(shouldValidate("reject")),
  test.assertTrue(shouldValidate(null), "Null value should return true because global is set to reject"),
  test.assertTrue(shouldValidate(undefined), "Undefined value should return true because global is set to reject"),
  test.assertFalse(shouldValidate("doNotValidate"))
])

updateGlobalConfigFile("doNotValidate");

assertions.concat([
  test.assertTrue(shouldValidate("accept")),
  test.assertTrue(shouldValidate("reject")),
  test.assertFalse(shouldValidate(null), "Null value should return true because global is set to doNotValidate"),
  test.assertFalse(shouldValidate(undefined), "Undefined value should return true because global is set to doNotValidate"),
  test.assertFalse(shouldValidate("doNotValidate"))
])


assertions;
