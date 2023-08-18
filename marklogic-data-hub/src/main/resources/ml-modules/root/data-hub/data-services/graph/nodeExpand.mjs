/**
 Copyright (c) 2021 MarkLogic Corporation

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

'use strict';

// No privilege required: No special privilege is needed for this endpoint

import httpUtils from "/data-hub/5/impl/http-utils.mjs";
import graphUtils from "/data-hub/5/impl/graph-utils.mjs";

const sem = require("/MarkLogic/semantics.xqy");

const nodeInfo = external.nodeInfo;
const limitParam = external.limit;
let limit = limitParam;

if(nodeInfo == null) {
  httpUtils.throwBadRequest("Request cannot be empty");
}

const entityTypeIds = graphUtils.getAllEntityIds();
limit = limit || 100;
let queryObj = JSON.parse(nodeInfo);
const nodeToExpand = queryObj.parentDocURI;

let isConcept = false;
if(queryObj.isConcept != null && queryObj.isConcept === true){
  isConcept = true;
}

if (nodeToExpand == null) {
  httpUtils.throwBadRequest("Missing parentIRI. Required to expand a node.")
}
let result;
let totalEstimate = 0;
if(isConcept) {
  let conceptIRI = sem.iri(nodeToExpand);
  result = graphUtils.getEntityNodesByConcept(conceptIRI, limit);
} else {
  result = graphUtils.getEntityNodesByDocument(nodeToExpand, limit);
  const subjectIRIs = [];
  for (const triple of cts.triples(null, sem.curieExpand("rdfs:isDefinedBy"), null, "=", [], cts.documentQuery(nodeToExpand))) {
    subjectIRIs.push(sem.tripleSubject(triple));
  }
  totalEstimate = fn.count(cts.triples(subjectIRIs, graphUtils.getAllPredicates(), null, ["=","=","="])) + fn.count(cts.triples(null, graphUtils.getAllPredicates(), subjectIRIs, ["=","=","="]));
}

let {nodes, edges} = graphUtils.graphResultsToNodesAndEdges(result, entityTypeIds, false, nodeToExpand);
if (isConcept) {
  totalEstimate = nodes.length;
}

const response = {
  'total': totalEstimate,
  'limit': limit,
  'nodes': nodes,
  'edges': edges
};

response;
