declareUpdate();
// This tests provenance planned for the 5.7.0 release
const mjsProxy = require("/data-hub/core/util/mjsProxy.sjs");
const config = mjsProxy.requireMjsModule("/com.marklogic.hub/config.mjs");
const test = require("/test/test-helper.xqy");
const hubTest = require("/test/data-hub-test-helper.xqy");
const mjsProxy = require("/data-hub/core/util/mjsProxy.sjs");
const flowProvenance = mjsProxy.requireMjsModule("/data-hub/5/flow/flowProvenance.mjs");
const mjsProxy = require("/data-hub/core/util/mjsProxy.sjs");
const StepExecutionContext = mjsProxy.requireMjsModule("/data-hub/5/flow/stepExecutionContext.mjs");
const mjsProxy = require("/data-hub/core/util/mjsProxy.sjs");
const provLib = mjsProxy.requireMjsModule("/data-hub/5/impl/prov.mjs");
const stagingDB = config.STAGINGDATABASE;
const assertions = [];

function assertValidRecordProvenance(provDocument) {
  assertions.push(test.assertEqual(stagingDB, fn.string(provDocument.xpath("/*:document/*:entity/database")),
    `The database '${stagingDB}' should be captured.`
  ));
  assertions.push(test.assertEqual("job:my-job-id", fn.string(provDocument.xpath("/*:document/*:wasGeneratedBy/*:activity/@*:ref")),
    "The document should be generated by 'job:my-job-id'."
  ));
  assertions.push(test.assertEqual("step:myStep", fn.string(provDocument.xpath("/*:document/*:wasInfluencedBy/*:influencer/@*:ref")),
    "The document should be influenced by 'step:myStep'."
  ));
  assertions.push(test.assertEqual(`user:${xdmp.getCurrentUser()}`, fn.string(provDocument.xpath("/*:document/*:wasAttributedTo/*:agent/@*:ref")),
    `The document should have wasAttributedTo 'user:${xdmp.getCurrentUser()}'.`
  ));
  assertions.push(test.assertEqual(1, fn.count(provDocument.xpath("/*:document/*:wasDerivedFrom/*:usedEntity/@*:ref")),
    `The document should have 1 wasDerivedFrom. Has ${fn.distinctValues(provDocument.xpath("/*:document/*:wasDerivedFrom/*:usedEntity/@*:ref")).toArray().join()}`
  ));
  assertions.push(test.assertEqual('external:customers.csv', fn.substringBefore(fn.string(provDocument.xpath("/*:document/*:wasDerivedFrom/*:usedEntity/@*:ref")), "#"),
    `The document should have wasDerivedFrom 'external:customers.csv'.`
  ));
}

function assertValidSourceProvenance(provDocument) {
  assertions.push(test.assertEqual("customers.csv", fn.string(provDocument.xpath("/*:document/*:entity/file")),
    "The file 'customers.csv' should be captured."
  ));
  assertions.push(test.assertEqual("Oracle", fn.string(provDocument.xpath("/*:document/*:entity/dataSourceName")),
    "The data source name 'Oracle' should be captured."
  ));
  assertions.push(test.assertEqual("SQL Database", fn.string(provDocument.xpath("/*:document/*:entity/dataSourceType")),
    "The data source type 'SQL Database' should be captured."
  ));
}

const flowName = "doesntMatter";

const fakeFlow = {
  name:flowName,
  steps: {
    "1": {
      name:"myStep",
      stepDefinitionName: "default-ingestion",
      stepDefinitionType: "ingestion"
    }
  }
};

let provDocuments;
let stepExecutionContext = new StepExecutionContext(fakeFlow, "1", {name:"default-ingestion", type: "ingestion"}, "my-job-id", { latestProvenance: true, file: "customers.csv", sourceName: "Oracle", sourceType:"SQL Database", targetDatabase: "data-hub-STAGING" });
let provenanceWriteQueue = provLib.getProvenanceWriteQueue();

// test JSON Object entity instance
stepExecutionContext.completedItems = ["testJSONObject.json"];
flowProvenance.writeProvenanceData(stepExecutionContext, [
  {uri: "testJSONObject.json", value: { envelope:{ instance: {}}}}
]);
provenanceWriteQueue.persist(stagingDB);


provDocuments = hubTest.getProvDocuments(stagingDB);
assertions.push(test.assertEqual(2, fn.count(provDocuments),
  "Two provenance documents should be captured (1 source + 1 written record)."
));
for (let provDocument of provDocuments) {
  if (fn.exists(provDocument.xpath("/*:document/*:entity/*:dataSourceName"))) {
    assertValidSourceProvenance(provDocument);
  } else {
    assertValidRecordProvenance(provDocument);
    assertions.push(test.assertEqual("testJSONObject.json", fn.string(provDocument.xpath("*:document/*:entity/documentURI")),
      "The document URI 'testJSONObject.json' should be captured."
    ));
  }
}

assertions;
