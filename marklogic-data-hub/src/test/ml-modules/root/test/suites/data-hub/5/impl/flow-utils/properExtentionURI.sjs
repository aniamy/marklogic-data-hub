const test = require("/test/test-helper.xqy");

const mjsProxy = require("/data-hub/core/util/mjsProxy.sjs");
const flowUtils = mjsProxy.requireMjsModule("/data-hub/5/impl/flow-utils.mjs");

[
  test.assertEqual('/test.json', flowUtils.properExtensionURI('/test.json', 'json')),
  test.assertEqual('/test.json', flowUtils.properExtensionURI('/test.xml', 'json')),
  test.assertEqual('/test.xml', flowUtils.properExtensionURI('/test.json', 'xml')),
  test.assertEqual('/test.xml', flowUtils.properExtensionURI('/test.xml', 'xml')),
  test.assertEqual('/test.csv-000.xml', flowUtils.properExtensionURI('/test.csv-000', 'xml')),
  test.assertEqual('/test.csv-000.json', flowUtils.properExtensionURI('/test.csv-000', 'json')),
  test.assertEqual(null, flowUtils.properExtensionURI(null, 'json'))
];
