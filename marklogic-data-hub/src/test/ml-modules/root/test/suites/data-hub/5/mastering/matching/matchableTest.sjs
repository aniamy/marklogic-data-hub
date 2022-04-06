const { Matchable } = require('/data-hub/5/mastering/matching/matchable.sjs');
const test = require("/test/test-helper.xqy");

function testMatchableClass() {
  const matchableInstance = new Matchable({}, {});
  return [
    test.assertExists(matchableInstance, "Matchable class instance should exist."),
    test.assertExists(matchableInstance.baselineQuery, "Matchable class instance function baselineQuery should exist."),
    test.assertExists(matchableInstance.matchRulesetDefinitions, "Matchable class instance function matchRulesetDefinitions should exist."),
    test.assertExists(matchableInstance.thresholdDefinitions, "Matchable class instance function thresholdDefinitions should exist."),
    test.assertExists(matchableInstance.filterQuery, "Matchable class instance function filterQuery should exist."),
    test.assertExists(matchableInstance.scoreDocument, "Matchable class instance function scoreDocument should exist."),
    test.assertExists(matchableInstance.buildActionDetails, "Matchable class instance function buildActionDetails should exist.")
  ];
}

function testBaselineQuery() {
  const matchableEntityInstanceQuery = new Matchable({
    targetEntityType: "http://example.org/Customer-0.0.1/Customer"
  }, {}).baselineQuery();
  const matchableEntityInstanceFallbackQuery = new Matchable({
    targetEntityType: "http://example.org/Customer-0.0.1/CustomerWithoutTriplesFromTDE"
  }, {}).baselineQuery();
  const matchableNoEntityQuery = new Matchable({
    collections: {
      content: "MyMatchCollection"
    }
  }, {}).baselineQuery();
  const matchableWithBaselineQueryInterceptorsQuery = new Matchable({
    targetEntityType: "http://example.org/Customer-0.0.1/Customer",
    baselineQueryInterceptors: [
      { path: "/test/suites/data-hub/5/mastering/matching/test-data/matchableInterceptors.sjs", function: "baselineQueryInterceptorA" },
      { path: "/test/suites/data-hub/5/mastering/matching/test-data/matchableInterceptors.sjs", function: "baselineQueryInterceptorB" }
    ]
  }, {}).baselineQuery();
  const interceptorQueries = fn.tail(cts.andQueryQueries(matchableWithBaselineQueryInterceptorsQuery)).toArray();
  let matchableWithBadBaselineQueryInterceptorsError;
  try {
    let invalidBaselineQuery = new Matchable({
      targetEntityType: "http://example.org/Customer-0.0.1/Customer",
      baselineQueryInterceptors: [
        { path: "/non-existing/matchableInterceptors.sjs", function: "myNonExistentFunction" }
      ]
    }, {}).baselineQuery();
    test.assertNotExists(invalidBaselineQuery, "invalidBaselineQuery should not exist.")
  } catch (e) {
    matchableWithBadBaselineQueryInterceptorsError = e;
  }
  return [
    test.assertExists(matchableEntityInstanceQuery, "matchableEntityInstanceQuery should exist."),
    test.assertTrue(matchableEntityInstanceQuery instanceof cts.tripleRangeQuery, "matchableEntityInstanceQuery should be a triple range query."),
    test.assertEqual(sem.iri("http://example.org/Customer-0.0.1/Customer"), cts.tripleRangeQueryObject(matchableEntityInstanceQuery), "matchableEntityInstanceQuery should have it's object properly set."),
    test.assertExists(matchableEntityInstanceFallbackQuery, "matchableEntityInstanceFallbackQuery should exist."),
    test.assertTrue(matchableEntityInstanceFallbackQuery instanceof cts.collectionQuery, "matchableEntityInstanceFallbackQuery should be a collection query."),
    test.assertEqual("CustomerWithoutTriplesFromTDE", cts.collectionQueryUris(matchableEntityInstanceFallbackQuery), "matchableEntityInstanceFallbackQuery should have the proper collection name."),
    test.assertTrue(matchableNoEntityQuery instanceof cts.collectionQuery, "matchableNoEntityQuery should be a collection query."),
    test.assertEqual("MyMatchCollection", cts.collectionQueryUris(matchableNoEntityQuery), "matchableNoEntityQuery should have a scope name of info."),
    test.assertTrue(matchableWithBaselineQueryInterceptorsQuery instanceof cts.andQuery, "matchableWithBaselineQueryInterceptorsQuery should be an and query."),
    test.assertTrue(interceptorQueries[0] instanceof cts.collectionQuery, "interceptorQueries[0] should be a collection query."),
    test.assertEqual("InterceptorA", cts.collectionQueryUris(interceptorQueries[0]), "interceptorQueries[0] should have a scope name of info."),
    test.assertTrue(interceptorQueries[1] instanceof cts.collectionQuery, `interceptorQueries[1] should be a collection query. ${xdmp.toJsonString(interceptorQueries[1])}`),
    test.assertEqual("InterceptorB", cts.collectionQueryUris(interceptorQueries[1]), "interceptorQueries[1] should have a scope name of info."),
    test.assertTrue(fn.exists(matchableWithBadBaselineQueryInterceptorsError), "An error should be thrown if an invalid interceptor is provided."),
    test.assertEqual("400", matchableWithBadBaselineQueryInterceptorsError.data[0], "Bad interceptor error should return Bad Request.")
  ];
}

function testFilterQuery() {
  const docA = cts.doc("/content/docA.json");
  const filterQueryJustDoc = new Matchable({}, {}).filterQuery(docA);
  const filterQueryDocAndSerialized = new Matchable({ filterQuery: { collectionQuery: { uris: ["new"] } } }, {}).filterQuery(docA);
  const filterWithInterceptorQuery = new Matchable({
    filterQueryInterceptors: [
      { path: "/test/suites/data-hub/5/mastering/matching/test-data/matchableInterceptors.sjs", function: "filterQueryInterceptor" }
    ]
  }, {}).filterQuery(docA);
  const interceptorQuery = fn.head(fn.tail(cts.andQueryQueries(filterWithInterceptorQuery)));
  let matchableWithBadFilterQueryInterceptorError;
  try {
    let invalidFilterQuery = new Matchable({
      filterQueryInterceptors: [
        { path: "/non-existing/matchableInterceptors.sjs", function: "myNonExistentFunction" }
      ]
    }, {}).filterQuery(docA);
    test.assertNotExists(invalidFilterQuery, "invalidFilterQuery should not exist.")
  } catch (e) {
    matchableWithBadFilterQueryInterceptorError = e;
  }
  return [
    test.assertExists(filterQueryJustDoc, "filterQueryJustDoc should exist."),
    test.assertTrue(filterQueryJustDoc instanceof cts.notQuery, "filterQueryJustDoc should be a triple range query."),
    test.assertEqual(Sequence.from(["/content/docA.json", "/content/docB.json"]), cts.documentQueryUris(cts.notQueryQuery(filterQueryJustDoc)), "filterQueryJustDoc should have exclude doc and blocked by triples."),
    test.assertExists(filterQueryDocAndSerialized, "filterQueryDocAndSerialized should exist."),
    test.assertTrue(filterQueryDocAndSerialized instanceof cts.andNotQuery, "filterQueryDocAndSerialized should be an and not query."),
    test.assertEqual("new", cts.collectionQueryUris(cts.andNotQueryPositiveQuery(filterQueryDocAndSerialized)), `filterQueryDocAndSerialized postive query should be a collection query. ${xdmp.toJsonString(filterQueryDocAndSerialized)}`),
    test.assertEqual(Sequence.from(["/content/docA.json", "/content/docB.json"]), cts.documentQueryUris(cts.andNotQueryNegativeQuery(filterQueryDocAndSerialized)), `filterQueryDocAndSerialized negative query should be a document query. ${xdmp.toJsonString(filterQueryDocAndSerialized)}`),
    test.assertTrue(interceptorQuery instanceof cts.collectionQuery, "interceptorQuery should be a collection query."),
    test.assertEqual("docDeterminedCollection", cts.collectionQueryUris(interceptorQuery), "matchableNoEntityQuery should have a scope name of info."),
    test.assertTrue(fn.exists(matchableWithBadFilterQueryInterceptorError), "An error should be thrown if an invalid interceptor is provided."),
    test.assertEqual("400", matchableWithBadFilterQueryInterceptorError.data[0], "Bad interceptor error should return Bad Request.")
  ];
}

[]
  .concat(testMatchableClass())
  .concat(testBaselineQuery())
  .concat(testFilterQuery());
