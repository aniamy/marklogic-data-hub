package com.marklogic.hub.central.entities.search.impl;

import com.marklogic.client.query.StructuredQueryBuilder;
import com.marklogic.client.query.StructuredQueryDefinition;
import com.marklogic.hub.central.entities.search.Constants;
import com.marklogic.hub.central.entities.search.models.DocSearchQueryInfo;

public class CustomTriplesHandler {

    public StructuredQueryDefinition buildQuery(DocSearchQueryInfo.RelatedData data, StructuredQueryBuilder queryBuilder) {

        String predicate = "predicate:" + data.getPredicate();
        String object = "object:" + data.getDocIRI();
        String terms[] = new String[] {predicate, object};

        return queryBuilder.customConstraint(Constants.TRIPLES_CONSTRAINT_NAME, terms);

        /*
        * <custom-constraint-query>
            <constraint-name>triples</constraint-name>
            <predicate>http://marklogic.com/example/BabyRegistry-0.0.1/BabyRegistry/ownedBy</predicate>
            <object>object:http://marklogic.com/example/BabyRegistry-0.0.1/BabyRegistry/3039</object>
        </custom-constraint-query>
        * */

    }


}
