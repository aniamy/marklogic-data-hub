@Library('shared-libraries') _
import groovy.json.JsonSlurper
import groovy.json.JsonSlurperClassic
import org.jenkinsci.plugins.workflow.steps.FlowInterruptedException
JIRA_ID="";
commitMessage="";
def prResponse="";
def prNumber;
def props;
githubAPIUrl="https://api.github.com/repos/marklogic/marklogic-data-hub"
def loadProperties() {
    node {
        checkout scm
        properties = new Properties()
        props.load(propertiesFile.newDataInputStream())
        echo "Immediate one ${properties.repo}"
    }
}
def dhflinuxTests(String mlVersion,String type){
    	script{
    		props = readProperties file:'data-hub/pipeline.properties';
    		copyRPM type,mlVersion
    		def dockerhost=setupMLDockerCluster 3
    		sh 'docker exec -u builder -i '+dockerhost+' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;set +e;./gradlew marklogic-data-hub:bootstrapAndTest -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-central:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ |& tee console.log;sleep 10s;./gradlew ml-data-hub:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew web:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-spark-connector:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew ml-data-hub:testFullCycle -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;"'
    		junit '**/TEST-*.xml'
            def output=readFile 'data-hub/console.log'
                    def result=false;
            if(output.contains("npm ERR!")){
                result=true;
            }
            if(result){
                currentBuild.result='UNSTABLE'
            }
                }

}
def dhfCypressE2ETests(String mlVersion, String type){
    script{
        copyRPM type,mlVersion
        env.mlVersion=mlVersion;
        setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
        copyArtifacts filter: '**/*central*.war', fingerprintArtifacts: true, flatten: true, projectName: '${JOB_NAME}', selector: specific('${BUILD_NUMBER}')
        sh(script:'''#!/bin/bash
                    export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
                    export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;
                    export M2_HOME=$MAVEN_HOME/bin;
                    export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;
                    cd $WORKSPACE;
                    WAR_NAME=$(basename *central*.war )
                    cd $WORKSPACE/data-hub;
                    rm -rf $GRADLE_USER_HOME/caches;
                    ./gradlew clean;
                    cd marklogic-data-hub-central/ui/e2e;
                    chmod +x setup.sh;
                    ./setup.sh dhs=false mlHost=localhost;
                    nohup java -jar $WORKSPACE/$WAR_NAME >> nohup.out &
                    sleep 10s;
                    mkdir -p output;
                    docker build . -t cypresstest;
                    docker run --name cypresstest --env CYPRESS_BASE_URL=http://$HOSTNAME:8080 --env cypress_mlHost=$HOSTNAME cypresstest |& tee output/console.log;
                    docker cp cypresstest:results output;
                    docker cp cypresstest:cypress/videos output
                    mkdir -p ${mlVersion};
                    mv output ${mlVersion}/;
                 ''')
        junit '**/e2e/**/*.xml'
        def output=readFile "data-hub/marklogic-data-hub-central/ui/e2e/${mlVersion}/output/console.log"
        def result=false;
        if(output.contains("npm ERR!")){
            result=true;
        }
        if(result){
           currentBuild.result='UNSTABLE'
        }
    }
}
def dhfqsLinuxTests(String mlVersion,String type){
	script{
         copyRPM type,mlVersion
         setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
         env.mlVersion=mlVersion;
         sh(script:'''#!/bin/bash
            export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;
            export M2_HOME=$MAVEN_HOME/bin;
            export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;
            cd $WORKSPACE/data-hub;
            rm -rf $GRADLE_USER_HOME/caches;
            ./gradlew clean;
            ./gradlew build -x test --parallel -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;
            nohup ./gradlew web:bootRun >> $WORKSPACE/bootRun.out &
            sleep 120s;
            nohup ./gradlew web:runUI >> $WORKSPACE/runUI.out &
            sleep 120s;
            cd web;
            ./node_modules/.bin/ng e2e --devServerTarget="" --suite all || true;
            mkdir -p ${mlVersion};
            mv e2e/reports ${mlVersion};
            mv e2e/screenshoter-plugin ${mlVersion};
            mv $WORKSPACE/nohup.out ${mlVersion};
         ''')
         junit "**/${mlVersion}/**/*.xml"
         archiveArtifacts artifacts: "data-hub/web/${mlVersion}/**/*"
	     }
}
def dhfWinTests(String mlVersion, String type){
    script{
        copyMSI type,mlVersion;
        def pkgOutput=bat(returnStdout:true , script: '''
	                    cd xdmp/src
	                    for /f "delims=" %%a in ('dir /s /b *.msi') do set "name=%%~a"
	                    echo %name%
	                    ''').trim().split();
	    def pkgLoc=pkgOutput[pkgOutput.size()-1]
	    gitCheckout 'ml-builds','https://github.com/marklogic/MarkLogic-Builds','master'
	    def bldOutput=bat(returnStdout:true , script: '''
        	           cd ml-builds/scripts/lib/
        	           CD
        	        ''').trim().split();
        def bldPath=bldOutput[bldOutput.size()-1]
        setupMLWinCluster bldPath,pkgLoc
        bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat clean'
        bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub:bootstrapAndTest  || exit /b 0'
        bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub-central:test  || exit /b 0'
        bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat ml-data-hub:test  || exit /b 0'
        bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat web:test || exit /b 0'
        bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub-spark-connector:test  || exit /b 0'
        junit '**/TEST-*.xml'
    }
}
def winParallel(){
script{
                                copyMSI "Release","10.0-6";
                                def pkgOutput=bat(returnStdout:true , script: '''
                        	                    cd xdmp/src
                        	                    for /f "delims=" %%a in ('dir /s /b *.msi') do set "name=%%~a"
                        	                    echo %name%
                        	                    ''').trim().split();
                        	    def pkgLoc=pkgOutput[pkgOutput.size()-1]
                        	    gitCheckout 'ml-builds','https://github.com/marklogic/MarkLogic-Builds','master'
                        	    def bldOutput=bat(returnStdout:true , script: '''
                                	           cd ml-builds/scripts/lib/
                                	           CD
                                	        ''').trim().split();
                                def bldPath=bldOutput[bldOutput.size()-1]
                                setupMLWinCluster bldPath,pkgLoc,"w2k16-10-dhf-2,w2k16-10-dhf-3"
                                bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat clean'
                                bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub:bootstrapAndTest  || exit /b 0'
                                bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub-central:test  || exit /b 0'
                                bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat ml-data-hub:test  || exit /b 0'
                                bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\bin;$PATH & cd data-hub & gradlew.bat web:test || exit /b 0'
                                bat 'set PATH=C:\\Program Files\\Java\\openjdk1.8.0_41\\bin;$PATH & cd data-hub & gradlew.bat marklogic-data-hub-spark-connector:test  || exit /b 0'
                                junit '**/TEST-*.xml'
                            }
}
def getReviewState(){
    def  reviewResponse;
    def commitHash;
    withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
       reviewResponse = sh (returnStdout: true, script:'''
                            curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID/reviews
                           ''')
       commitHash = sh (returnStdout: true, script:'''
                         curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID
                       ''')
    }
    def jsonObj = new JsonSlurperClassic().parseText(commitHash.toString().trim())
    def commit_id=jsonObj.head.sha
    println(commit_id)
    def reviewState=getReviewStateOfPR reviewResponse,2,commit_id ;
    return reviewState
}
def PRDraftCheck(){
    def type;
    withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
        PrObj= sh (returnStdout: true, script:'''
                   curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID
                   ''')
    }
    def jsonObj = new JsonSlurperClassic().parseText(PrObj.toString().trim())
    return jsonObj.draft
}

def runCypressE2e(){
    script{
        copyRPM 'Release','10.0-6'
        setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
        sh 'rm -rf *central*.rpm || true'
        copyArtifacts filter: '**/*.rpm', fingerprintArtifacts: true, flatten: true, projectName: '${JOB_NAME}', selector: specific('${BUILD_NUMBER}')
        sh(script:'''#!/bin/bash
            export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
            sudo mladmin install-hubcentral $WORKSPACE/*central*.rpm;
            sudo mladmin add-javahome-hubcentral $JAVA_HOME
            sudo mladmin start-hubcentral
        ''')
        sh(script:'''#!/bin/bash
            export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
            export M2_LOCAL_REPO=$WORKSPACE/$M2_HOME_REPO
            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;
            export PATH=$M2_LOCAL_REPO:$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH;
            rm -rf $M2_LOCAL_REPO || true
            mkdir -p $M2_LOCAL_REPO
            cd $WORKSPACE/data-hub;
            ./gradlew publishToMavenLocal -Dmaven.repo.local=$M2_LOCAL_REPO -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/
            '''
        )
        sh(script:'''
          #!/bin/bash
          export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;
          export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;
          export M2_LOCAL_REPO=$WORKSPACE/$M2_HOME_REPO
          export PATH=$M2_LOCAL_REPO:$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH;
          cd $WORKSPACE/data-hub;
          rm -rf $GRADLE_USER_HOME/caches;
          cd marklogic-data-hub-central/ui/e2e;
          repo="maven {url '"$M2_LOCAL_REPO"'}"
          sed -i "/repositories {/a$repo" hc-qa-project/build.gradle
          chmod +x setup.sh;
          ./setup.sh dhs=false mlHost=localhost mlSecurityUsername=admin mlSecurityPassword=admin;
          '''
        )
        sh(script:'''#!/bin/bash
            export NODE_HOME=$NODE_HOME_DIR/bin;
            export PATH=$NODE_HOME:$PATH
            cd $WORKSPACE/data-hub/marklogic-data-hub-central/ui/e2e
            npm run cy:run |& tee -a e2e_err.log;
        '''
        )

        def output=readFile 'data-hub/marklogic-data-hub-central/ui/e2e/e2e_err.log'
        if(output.contains("npm ERR!")){
           // currentBuild.result='UNSTABLE';
        }

        junit '**/e2e/**/*.xml'
    }
}

def flexcodeScanAndReport(){

    def email=''
    if(env.CHANGE_AUTHOR){
        def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
        email=getEmailFromGITUser author
    }
    else { email=Email }

    email = email + ',Kavitha.Sivagnanam@marklogic.com'
    def palamida_url="http://palamida-2.marklogic.com:8888"
    def emailbody = ''
    cleanWs deleteDirs: true, patterns: [[pattern: 'data-hub/**', type: 'EXCLUDE']]

    withCredentials([string(credentialsId: 'palamida_jwt', variable: 'jwt')]) {

        StartScan(baseUrl: palamida_url, projectName: 'ml-dhf', token: jwt)

        emailbody = sh(returnStdout: true, script: '''

         report_json="marklogic-data-hub-report.json"
         report_p1="marklogic-data-hub-report-p1.json"

         curl -X GET ''' + palamida_url + '''/codeinsight/api/project/inventory/21 -H "Authorization: Bearer $jwt" > $report_json

         jq '[[.inventoryItems | .[] | select(.vulnerabilities != null) | select(.vulnerabilities[].vulnerabilityCvssV3Severity == "CRITICAL" or .vulnerabilities[].vulnerabilityCvssV2Severity == "HIGH")] | unique | .[] | del(.vulnerabilities[] | select(.vulnerabilityCvssV3Severity != "CRITICAL" and .vulnerabilityCvssV2Severity != "HIGH"))]' $report_json>$report_p1

         if [ "$(cat $report_p1)" != '[]' ]
         then
          cat $report_p1 | jq '.[] | {(.name): (.vulnerabilities+.filePaths)}' | sed '1d;$d;/vulnerabilityId/d;/vulnerabilityDescription/d;/vulnerabilityCvssV.Score/d;/vulnerabilitySource/d;/^{/d;/^}/d' | sed '1s/^/******** HIGH VULNERABILITIES: \\n\\n/;'
         else
          echo ''
         fi

        ''')
    }

    if(emailbody.trim() != ''){
     emailext mimeType: 'text/plain', body: emailbody.trim(), subject: 'FlexCode report', to: email
    }

    archiveArtifacts artifacts: '*.json'

}

void UnitTest(){
    script{
        props = readProperties file:'data-hub/pipeline.properties';
        copyRPM 'Release','10.0-6'
        setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
        sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;set +e;./gradlew clean;./gradlew marklogic-data-hub:bootstrap -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-central:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ |& tee console.log;sleep 10s;./gradlew ml-data-hub:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;./gradlew web:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-spark-connector:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-central:lintUI -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;'
        junit '**/TEST-*.xml'
        cobertura coberturaReportFile: '**/cobertura-coverage.xml'
        jacoco classPattern: 'data-hub/marklogic-data-hub-central/build/classes/java/main/com/marklogic/hub/central,data-hub/marklogic-data-hub-spark-connector/build/classes/java/main/com/marklogic/hub/spark,data-hub/marklogic-data-hub/build/classes/java/main/com/marklogic/hub',exclusionPattern: '**/*Test*.class'
        def output=readFile 'data-hub/console.log'
        def result=false;
        if(output.contains("npm ERR!")){
            result=true;
        }
        if(result){
            currentBuild.result='UNSTABLE'
        }
        if(env.CHANGE_TITLE){
            JIRA_ID=env.CHANGE_TITLE.split(':')[0]
            jiraAddComment comment: 'Jenkins Unit Test Results For PR Available', idOrKey: JIRA_ID, site: 'JIRA'
        }
        if(!env.CHANGE_URL){
            env.CHANGE_URL=" "
        }
    }
}

void PreBuildCheck() {

 if(env.CHANGE_ID){

  if(PRDraftCheck()){ sh 'exit 1' }

  if((!env.CHANGE_TITLE.startsWith("DHFPROD-")) && (!env.CHANGE_TITLE.startsWith("DEVO-"))){ sh 'exit 1' }

  if(getReviewState().equalsIgnoreCase("CHANGES_REQUESTED")){
       println(reviewState)
       sh 'exit 1'
  }

 }
 def obj=new abortPrevBuilds();
 obj.abortPrevBuilds();

}

void Tests(){
    script{
        props = readProperties file:'data-hub/pipeline.properties';
        copyRPM 'Release','10.0-6'
        mlHubHosts=setupMLDockerNodes 3
        env.mlHubHosts=mlHubHosts
        sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;set +e;./gradlew clean;./gradlew marklogic-data-hub:testAcceptance -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ -PmlHost=${mlHubHosts};'
        junit '**/TEST-*.xml'
        if(env.CHANGE_TITLE){
            JIRA_ID=env.CHANGE_TITLE.split(':')[0]
            jiraAddComment comment: 'Jenkins Core Unit Test Results For PR Available', idOrKey: JIRA_ID, site: 'JIRA'
        }
        if(!env.CHANGE_URL){
            env.CHANGE_URL=" "
        }
    }
}

void BuildDatahub(){
    script{
        props = readProperties file:'data-hub/pipeline.properties';
        if(env.CHANGE_TITLE){
            JIRA_ID=env.CHANGE_TITLE.split(':')[0];
            def transitionInput =[transition: [id: '41']]
            //jiraTransitionIssue idOrKey: JIRA_ID, input: transitionInput, site: 'JIRA'
        }
    }
    println(BRANCH_NAME)
    sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;./gradlew build -x test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ --parallel;'
    archiveArtifacts artifacts: 'data-hub/marklogic-data-hub/build/libs/* , data-hub/ml-data-hub-plugin/build/libs/* , data-hub/web/build/libs/* , data-hub/marklogic-data-hub-central/build/libs/* , data-hub/marklogic-data-hub-central/build/**/*.rpm , data-hub/marklogic-data-hub-spark-connector/build/libs/*', onlyIfSuccessful: true

}

void dh5Example() {
    sh 'cd $WORKSPACE/data-hub/examples/dh-5-example;repo="    maven {url \'http://distro.marklogic.com/nexus/repository/maven-snapshots/\'}";sed -i "/repositories {/a$repo" build.gradle; '
    copyRPM 'Release','10.0-6'
    script{
        props = readProperties file:'data-hub/pipeline.properties';
        def dockerhost=setupMLDockerCluster 3
        sh '''
                            docker exec -u builder -i '''+dockerhost+''' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;\
                            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR; \
                            export M2_HOME=$MAVEN_HOME/bin; \
                            export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin; \
                            cd $WORKSPACE/data-hub/examples/dh-5-example; \
                            rm -rf $GRADLE_USER_HOME/caches; \
                            ./gradlew -i hubInit -Ptesting=true; \
                            cp ../../marklogic-data-hub/gradle.properties .; \
                            ./gradlew -i mlDeploy -Ptesting=true -PmlUsername=admin -PmlPassword=admin; \
                            ./gradlew hubRunFlow -PflowName=ingestion_only-flow -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=ingestion_mapping-flow -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=ingestion_mapping_mastering-flow -Ptesting=true;
                            "
                        '''
    }
}

void dhCustomHook() {
                     sh 'cd $WORKSPACE/data-hub/examples/dhf5-custom-hook;repo="    maven {url \'http://distro.marklogic.com/nexus/repository/maven-snapshots/\'}";sed -i "/repositories {/a$repo" build.gradle; '
                     copyRPM 'Release','10.0-6'
                     script{
                        props = readProperties file:'data-hub/pipeline.properties';
                        def dockerhost=setupMLDockerCluster 3
                        sh '''
                            docker exec -u builder -i '''+dockerhost+''' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;\
                            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR; \
                            export M2_HOME=$MAVEN_HOME/bin; \
                            export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin; \
                            cd $WORKSPACE/data-hub/examples/dhf5-custom-hook; \
                            rm -rf $GRADLE_USER_HOME/caches; \
                            ./gradlew -i hubInit -Ptesting=true; \
                            cp ../../marklogic-data-hub/gradle.properties .; \
                            ./gradlew -i mlDeploy -Ptesting=true -PmlUsername=admin -PmlPassword=admin; \
                            ./gradlew hubRunFlow -PflowName=LoadOrders -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=LoadOrders -Ptesting=true;
                            "
                        '''
                      }
}

void mappingExample() {
                     sh 'cd $WORKSPACE/data-hub/examples/mapping-example;repo="    maven {url \'http://distro.marklogic.com/nexus/repository/maven-snapshots/\'}";sed -i "/repositories {/a$repo" build.gradle; '
                     copyRPM 'Release','10.0-6'
                     script{
                        props = readProperties file:'data-hub/pipeline.properties';
                        def dockerhost=setupMLDockerCluster 3
                        sh '''
                            docker exec -u builder -i '''+dockerhost+''' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;\
                            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR; \
                            export M2_HOME=$MAVEN_HOME/bin; \
                            export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin; \
                            cd $WORKSPACE/data-hub/examples/mapping-example; \
                            rm -rf $GRADLE_USER_HOME/caches; \
                            ./gradlew -i hubInit -Ptesting=true; \
                            cp ../../marklogic-data-hub/gradle.properties .; \
                            ./gradlew -i mlDeploy -Ptesting=true -PmlUsername=admin -PmlPassword=admin; \
                            ./gradlew hubRunFlow -PflowName=jsonToJson -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=jsonToXml -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=xmlToJson -Ptesting=true; \
                            ./gradlew hubRunFlow -PflowName=xmlToXml -Ptesting=true;
                            "
                        '''
                        }
}

void smartMastering() {
                     sh 'cd $WORKSPACE/data-hub/examples/smart-mastering-complete;repo="    maven {url \'http://distro.marklogic.com/nexus/repository/maven-snapshots/\'}";sed -i "/repositories {/a$repo" build.gradle; '
                     copyRPM 'Release','10.0-6'
                     script{
                        props = readProperties file:'data-hub/pipeline.properties';
                        def dockerhost=setupMLDockerCluster 3
                        sh '''
                            docker exec -u builder -i '''+dockerhost+''' /bin/sh -c "su -builder;export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;\
                            export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR; \
                            export M2_HOME=$MAVEN_HOME/bin; \
                            export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin; \
                            cd $WORKSPACE/data-hub/examples/smart-mastering-complete; \
                            rm -rf $GRADLE_USER_HOME/caches; \
                            ./gradlew -i hubInit -Ptesting=true; \
                            cp ../../marklogic-data-hub/gradle.properties .; \
                            ./gradlew -i mlDeploy -Ptesting=true -PmlUsername=admin -PmlPassword=admin; \
                            ./gradlew hubRunFlow -PflowName=persons -Ptesting=true;
                            "
                        '''
                        }
}

pipeline{
	agent none;
	options {
  	checkoutToSubdirectory 'data-hub'
  	buildDiscarder logRotator(artifactDaysToKeepStr: '', artifactNumToKeepStr: '', daysToKeepStr: '30', numToKeepStr: '')
	}
	environment{
	JAVA_HOME_DIR="~/java/openjdk-1.8.0-161"
	GRADLE_DIR="/.gradle"
	MAVEN_HOME="/usr/local/maven"
	M2_HOME_REPO="/repository"
	NODE_HOME_DIR="~/nodeJs/node-v12.18.3-linux-x64"
	DMC_USER     = credentials('MLBUILD_USER')
    DMC_PASSWORD= credentials('MLBUILD_PASSWORD')
	}
	parameters{
	string(name: 'Email', defaultValue: 'stadikon@marklogic.com,kkanthet@marklogic.com,sbalasub@marklogic.com,nshrivas@marklogic.com,ssambasu@marklogic.com,rrudin@marklogic.com,rdew@marklogic.com,mwooldri@marklogic.com,rvudutal@marklogic.com,asonvane@marklogic.com,ban@marklogic.com,hliu@marklogic.com,tisangul@marklogic.com,Vasu.Gourabathina@marklogic.com,Sanjeevani.Vishaka@marklogic.com,Inder.Sabharwal@marklogic.com,btang@marklogic.com,abajaj@marklogic.com,fsnow@marklogic.com,srahman@marklogic.com,yakov.feldman@marklogic.com' ,description: 'Who should I say send the email to?')
	}
	stages{
	    stage('Pre-Build-Check'){
	    agent { label 'dhfLinuxAgent'}
	    steps{ PreBuildCheck() }
	    post{
	        failure{
	            script{
                 def email;
                 if(env.CHANGE_AUTHOR){
                   def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                   email=getEmailFromGITUser author
                  }else{ email=Email  }

                 sendMail email,'<h3>Pipeline Failed possibly because there is no JIRA ID. Please add JIRA ID to the <a href=${CHANGE_URL}>PR Title</a></h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'NO JIRA ID for $BRANCH_NAME | pipeline Failed  '
	            }
	        }
	    }
	    }
		stage('Build-datahub'){
		agent { label 'dhfLinuxAgent'}
			steps{BuildDatahub()}
				post{
                   failure {
                      println("Datahub Build FAILED")
                      script{
                      def email;
                    if(env.CHANGE_AUTHOR){
                    	def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                    	 email=getEmailFromGITUser author
                    }else{
                    email=Email
                    }
                     sendMail email,'<h3>Pipeline Failed at the stage while building datahub. Please fix the issues</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Data Hub Build for $BRANCH_NAME Failed'
                      }
                  }
                  }
		}
		stage('tests'){
		parallel{
		stage('Core-Unit-Tests'){
		agent { label 'dhfLinuxAgent'}
			steps{Tests()}
			post{
				  always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("Core Unit Tests Completed")
                    script{
                    env.TESTS_PASSED=true
                    def email;
                    if(env.CHANGE_AUTHOR){
                    def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                     email=getEmailFromGITUser author
                    }else{
                    	email=Email
                    }
                    sendMail email,'<h3>All the Core Unit Tests Passed on <a href=${CHANGE_URL}>$BRANCH_NAME</a> and the next stage is Code-review.</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Unit Tests for  $BRANCH_NAME Passed'
                    }
                   }
                   unstable {
                      println("Unit Tests Failed")
                      sh 'mkdir -p MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/'
                      archiveArtifacts artifacts: 'MLLogs/**/*'
                      script{
                      def email;
                    if(env.CHANGE_AUTHOR){
                    	def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                    	 email=getEmailFromGITUser author
                    }else{
                    email=Email
                    }
                      sendMail email,'<h3>Some of the  Core Unit Tests Failed on   <a href=${CHANGE_URL}>$BRANCH_NAME</a>. Please look into the issues and fix it.</h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Unit Tests for $BRANCH_NAME Failed'
                      }
                  }
                  }
		}
        stage('Unit-Tests'){
		agent { label 'dhfLinuxAgent'}
			steps{UnitTest()}
			post{
				  always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("Unit Tests Completed")
                    script{
                    env.UNIT_TESTS_PASSED=true
                    def email;
                    if(env.CHANGE_AUTHOR){
                    def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                     email=getEmailFromGITUser author
                    }else{
                    	email=Email
                    }
                    sendMail email,'<h3>All the Unit Tests Passed on <a href=${CHANGE_URL}>$BRANCH_NAME</a> and the next stage is Code-review.</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Unit Tests for  $BRANCH_NAME Passed'
                    }
                   }
                   unstable {
                      println("Unit Tests Failed")
                      sh 'mkdir -p MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/'
                      archiveArtifacts artifacts: 'MLLogs/**/*'
                      script{
                      def email;
                    if(env.CHANGE_AUTHOR){
                    	def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                    	 email=getEmailFromGITUser author
                    }else{
                    email=Email
                    }
                      sendMail email,'<h3>Some of the  Unit Tests Failed on   <a href=${CHANGE_URL}>$BRANCH_NAME</a>. Please look into the issues and fix it.</h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Unit Tests for $BRANCH_NAME Failed'
                      }
                  }
                  }
		}
		stage('cypresse2e'){
		agent { label 'dhfLinuxAgent'}
		steps{
		    runCypressE2e()
		}
        post{
				  always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("E2e Tests Completed")
                    script{
                    env.CYPRESSE2E_TESTS_PASSED=true
                    def email;
                    if(env.CHANGE_AUTHOR){
                    def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                     email=getEmailFromGITUser author
                    }else{
                    	email=Email
                    }
                    sendMail email,'<h3>All the E2E Tests Passed on <a href=${CHANGE_URL}>$BRANCH_NAME</a> and the next stage is Code-review.</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'E2E Tests for  $BRANCH_NAME Passed'
                    }
                   }
                   unstable {
                      println("E2E Tests Failed")
                      archiveArtifacts artifacts: "**/e2e/**/videos/**/*,**/e2e/**/screenshots/**/*"
                      script{
                      def email;
                    if(env.CHANGE_AUTHOR){
                    	def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                    	 email=getEmailFromGITUser author
                    }else{
                    email=Email
                    }
                      sendMail email,'<h3>Some of the  E2E Tests Failed on   <a href=${CHANGE_URL}>$BRANCH_NAME</a>. Please look into the issues and fix it.</h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'E2E Tests for $BRANCH_NAME Failed'
                      }
                  }
                  }
                  }}
                   post{
                     unstable { script{
                         if(!params.regressions) error("Pre merge tests Failed");
                     }}
                  }}
		stage('code-review'){
		when {
             expression {return env.TESTS_PASSED && env.UNIT_TESTS_PASSED && env.CYPRESSE2E_TESTS_PASSED && env.TESTS_PASSED.toBoolean() && env.UNIT_TESTS_PASSED.toBoolean() && env.CYPRESSE2E_TESTS_PASSED.toBoolean()}
  			 allOf {
    changeRequest author: '', authorDisplayName: '', authorEmail: '', branch: '', fork: '', id: '', target: 'feature/5.4-develop', title: '', url: ''
  }
  			beforeAgent true
		}
		agent {label 'dhmaster'};
		steps{
		script{
		def count=0;
		retry(4){
		count++;
		    props = readProperties file:'data-hub/pipeline.properties';
		    def reviewState=getReviewState()
			if(env.CHANGE_TITLE.split(':')[1].contains("Automated PR")){
				println("Automated PR")
				sh 'exit 0'
			}
			else if(reviewState.equalsIgnoreCase("APPROVED")){
			  sh 'exit 0'
			}
			else if(reviewState.equalsIgnoreCase("CHANGES_REQUESTED")){
			    println("Changes Requested")
                def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                email=getEmailFromGITUser author;

                if(count==4){
                sendMail email,'<h3>Changes Requested for <a href=${CHANGE_URL}>PR</a>. Please resolve those Changes</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Changes Requested for $BRANCH_NAME '
                }
			    currentBuild.result = 'ABORTED'
			}
			else{
                    withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
                  def  reviewersList = sh (returnStdout: true, script:'''
                   curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID/requested_reviewers
                   ''')
                   def  reviewesList = sh (returnStdout: true, script:'''
                                      curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID/reviews
                                      ''')
                    def slurper = new JsonSlurperClassic().parseText(reviewersList.toString().trim())
                    def emailList="";
                    if(slurper.users.isEmpty() && reviewesList.isEmpty()){
                        def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                        email=getEmailFromGITUser author;
                        if(count==4){
                        sendMail email,'<h3>Please assign some code reviewers <a href=${CHANGE_URL}>PR</a>. and restart this stage to continue.</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'No Code reviewers assigned for $BRANCH_NAME '
                        }
                        sh 'exit 123'
                    }else{
                        for(def user:slurper.users){
                            email=getEmailFromGITUser user.login;
                            emailList+=email+',';
                        }
                        sendMail emailList,'<h3>Code Review Pending on <a href=${CHANGE_URL}>PR</a>.</h3><h3>Please click on proceed button from the pipeline view below if all the reviewers approved the code </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Code Review Pending on $BRANCH_NAME '
                        try{
                            timeout(time: 15, unit: 'MINUTES') {
                                input message:'Code-Review Done?'
                            }
                        }catch(FlowInterruptedException err){
                            user = err.getCauses()[0].getUser().toString();
                            println(user)
                            if(user.equalsIgnoreCase("SYSTEM")){
                                 echo "Timeout 15mins"
                                 sh 'exit 123'
                            }else{
                                   currentBuild.result = 'ABORTED'
                            }
                        }
                        def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                        email=getEmailFromGITUser author;
                        if(count==4){
                        sendMail email,'<h3>Code Review is incomplete on <a href=${CHANGE_URL}>PR</a>.</h3><h3>Please Restart this stage from the pipeline view once code review is completed. </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Code Review is incomplete on $BRANCH_NAME  '
                        }
                    }
                 }
            }
        }
        }
		}
		}
		stage('Merge-PR'){
		when {
            expression {return env.TESTS_PASSED && env.UNIT_TESTS_PASSED && env.CYPRESSE2E_TESTS_PASSED && env.TESTS_PASSED.toBoolean() && env.UNIT_TESTS_PASSED.toBoolean() && env.CYPRESSE2E_TESTS_PASSED.toBoolean()}
            changeRequest author: '', authorDisplayName: '', authorEmail: '', branch: '', fork: '', id: '', target: 'feature/5.4-develop', title: '', url: ''
  			beforeAgent true
		}
		agent {label 'dhmaster'};
			steps{
			retry(5){
				withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
				script{
				    props = readProperties file:'data-hub/pipeline.properties';
					JIRA_ID=env.CHANGE_TITLE.split(':')[0]
    				def response = sh (returnStdout: true, script:'''curl -u $Credentials  --header "application/vnd.github.merge-info-preview+json" "'''+githubAPIUrl+'''/pulls/$CHANGE_ID" | grep '"mergeable_state":' | cut -d ':' -f2 | cut -d ',' -f1 | tr -d '"' ''')
    				response=response.trim();
    				println(response)
    				if(response.equals("clean")){
    					println("merging can be done")
    					sh "curl -o - -s -w \"\n%{http_code}\n\" -X PUT -d '{\"commit_title\": \"$JIRA_ID: merging PR\", \"merge_method\": \"rebase\"}' -u $Credentials "+ githubAPIUrl+"/pulls/$CHANGE_ID/merge | tail -2 > mergeResult.txt"
    					def mergeResult = readFile('mergeResult.txt').trim()
    					if(mergeResult=="200"){
    						println("Merge successful")
    					}else{
    						println("Merge Failed")
                            sh 'exit 123'
    					}
    				}else if(response.equals("blocked")){
    					println("retry blocked");
    					withCredentials([usernameColonPassword(credentialsId: '550650ab-ee92-4d31-a3f4-91a11d5388a3', variable: 'Credentials')]) {
                  def  reviewersList = sh (returnStdout: true, script:'''
                   curl -u $Credentials  -X GET  '''+githubAPIUrl+'''/pulls/$CHANGE_ID/requested_reviewers
                   ''')
                    def slurper = new JsonSlurperClassic().parseText(reviewersList.toString().trim())
                    def emailList="";
                    for(def user:slurper.users){
                        email=getEmailFromGITUser user.login;
                        emailList+=email+',';
                    }
                      sendMail emailList,'Check the Pipeline View Here: ${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID  \n\n\n Check Console Output Here: ${BUILD_URL}/console \n\n\n $BRANCH_NAME is waiting for the code-review to complete. Please click on proceed button if all the reviewers approved the code here. \n\n ${BUILD_URL}input ',false,'Waiting for code review $BRANCH_NAME '

                 }
    					sleep time: 30, unit: 'MINUTES'
    					throw new Exception("Waiting for all the status checks to pass");
    				}else if(response.equals("unstable")){
    					println("retry unstable")
    					sh "curl -o - -s -w \"\n%{http_code}\n\" -X PUT -d '{\"commit_title\": \"$JIRA_ID: merging PR\", \"merge_method\": \"rebase\"}' -u $Credentials  "+githubAPIUrl+"/pulls/$CHANGE_ID/merge | tail -2 > mergeResult.txt"
    					def mergeResult = readFile('mergeResult.txt').trim()
              if(mergeResult=="200"){
                println("Merge successful")
              }else{
                println("Merge Failed")
                sh 'exit 123'
              }
    					println("Result is"+ mergeResult)
    				}else{
    					println("merging not possible")
    					currentBuild.result = "FAILURE"
    					sh 'exit 1';
    				}
				}
				}
				}
			}
			post{
                  success {
                    println("Merge Successful")
                    script{
                    def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                    def email=getEmailFromGITUser author
					sendMail email,'<h3><a href=${CHANGE_URL}>$BRANCH_NAME</a> is merged </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME is Merged'
					}
                   }
                   failure {
                      println("Retried 5times")
                      script{
                    def author=env.CHANGE_AUTHOR.toString().trim().toLowerCase()
                    def email=getEmailFromGITUser author
                    sendMail email,'<h3>Could not rebase and merge the <a href=${CHANGE_URL}>$BRANCH_NAME</a></h3><h3>Please check if there are any conflicts due to rebase and merge and resolve them</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'Merging Failed on $BRANCH_NAME'
                      }
                  }
                  }
		}

        stage('publishing'){
         when {
           expression {
                    node('dhmaster') {
                        props = readProperties file: 'data-hub/pipeline.properties';
                        println(props['ExecutionBranch'])
                        return (env.BRANCH_NAME == props['ExecutionBranch']  && !params.regressions)
                   }
           }
         }
         agent { label 'dhfLinuxAgent' }
         steps {
               sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;cp ~/.gradle/gradle.properties $GRADLE_USER_HOME;chmod 777  $GRADLE_USER_HOME/gradle.properties;./gradlew build -x test -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ --parallel;./gradlew publish -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ --rerun-tasks'
               build job: 'DHF-Publish-RPM', propagate: false, wait: false
            }
        }

        stage('dhs-test'){
            when { expression {return params.regressions} }
            agent { label 'dhfLinuxAgent' }
            steps {
                sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;cp ~/.gradle/gradle.properties $GRADLE_USER_HOME;chmod 777  $GRADLE_USER_HOME/gradle.properties;./gradlew build -x test -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ --parallel;./gradlew publish -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ --rerun-tasks'
                build job: 'DatahubService/Run-Tests-dhs', propagate: false, wait: false
            }
        }

        stage('rh7-singlenode'){
            options {timeout(time: 3, unit: 'HOURS')}
            when { expression {return params.regressions} }
            agent { label 'dhfLinuxAgent'}
            steps{
                catchError(buildResult: 'SUCCESS', catchInterruptions: true) {

                    script{
                        props = readProperties file:'data-hub/pipeline.properties';
                        copyRPM 'Release','9.0-11'
                        setUpML '$WORKSPACE/xdmp/src/Mark*.rpm'
                        sh 'export JAVA_HOME=`eval echo "$JAVA_HOME_DIR"`;export GRADLE_USER_HOME=$WORKSPACE$GRADLE_DIR;export M2_HOME=$MAVEN_HOME/bin;export PATH=$JAVA_HOME/bin:$GRADLE_USER_HOME:$PATH:$MAVEN_HOME/bin;cd $WORKSPACE/data-hub;rm -rf $GRADLE_USER_HOME/caches;./gradlew clean;set +e;./gradlew marklogic-data-hub:bootstrapAndTest -Dorg.gradle.jvmargs=-Xmx1g -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew ml-data-hub:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew web:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew marklogic-data-hub-central:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ |& tee console.log;sleep 10s;./gradlew marklogic-data-hub-spark-connector:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;sleep 10s;./gradlew ml-data-hub:testFullCycle -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/ ;sleep 10s;./gradlew marklogic-data-hub-spark-connector:test -i --stacktrace -PnodeDistributionBaseUrl=http://node-mirror.eng.marklogic.com:8080/;'
                        junit '**/TEST-*.xml'
                        def output=readFile 'data-hub/console.log'
                        def result=false;
                        if(output.contains("npm ERR!")){
                            result=true;
                        }
                        if(result){
                            currentBuild.result='UNSTABLE'
                        }
                    }
                }}
			post{
				always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("End-End Tests Completed")
                    sendMail Email,'<h3>Tests Passed on Released 9.0 ML Server Single Node </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-11 | Single Node | Passed'

                   }
                   unstable {
                      println("End-End Tests Failed")
                      sh 'mkdir -p MLLogs;cp -r /var/opt/MarkLogic/Logs/* $WORKSPACE/MLLogs/'
                      archiveArtifacts artifacts: 'MLLogs/**/*'
                      sendMail Email,'<h3>Some Tests Failed on Released 9.0 ML Server Single Node </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-11 | Single Node | Failed'
                  }
                  }
        }

       stage('Linux Core Parallel Execution'){
         when { expression {return params.regressions} }
         parallel{
	  stage('rh7_cluster_10.0-Nightly'){
          options {timeout(time: 3, unit: 'HOURS')}
          agent { label 'dhfLinuxAgent'}
			steps{
              catchError(buildResult: 'SUCCESS', catchInterruptions: true) { dhflinuxTests("10.0","Latest")}
            }
			post{
				 always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("rh7_cluster_10.0-Nightly Tests Completed")
                    sendMail Email,'<h3>Tests Passed on Nigtly 10.0 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-Nightly | Cluster | Passed'
                    // sh './gradlew publish'
                   }
                   unstable {
                      println("rh7_cluster_10.0-Nightly Tests Failed")
                      sendMail Email,'<h3>Some Tests Failed on Nightly 10.0 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-Nightly | Cluster | Failed'
                  }
                  }
		}
		stage('rh7_cluster_9.0-Nightly'){
            options {timeout(time: 3, unit: 'HOURS')}
			agent { label 'dhfLinuxAgent'}
			steps{
              catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhflinuxTests("9.0","Latest")}
			}
			post{
				always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("rh7_cluster_9.0-Nightly Completed")
                    sendMail Email,'<h3>Tests Passed on Nigtly 9.0 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-Nightly | Cluster | Passed'
                   }
                   unstable {
                      println("rh7_cluster_9.0-Nightly Failed")
                      sendMail Email,'<h3>Some Tests Failed on Nightly 9.0 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-Nightly | Cluster | Failed'
                  }
                  }
		}
        stage('rh7_cluster_9.0-11'){
            options {timeout(time: 3, unit: 'HOURS')}
			agent { label 'dhfLinuxAgent'}
			steps{
                catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhflinuxTests("9.0-11","Release")}
			}
			post{
				always{
				  	sh 'rm -rf $WORKSPACE/xdmp'
				  }
                  success {
                    println("rh7_cluster_9.0-11 Tests Completed")
                    sendMail Email,'<h3>Tests Passed on  9.0-11 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-9.0-11 | Cluster | Passed'
                   }
                   unstable {
                      println("rh7_cluster_9.0-11 Tests Failed")
                  }
                  }
		}
         stage('rh7_cluster_10.0-3'){
               options {timeout(time: 3, unit: 'HOURS')}
               agent { label 'dhfLinuxAgent'}
               steps{
                   catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhflinuxTests("10.0-3","Release")}
               }
               post{
                 always{
                     sh 'rm -rf $WORKSPACE/xdmp'
                   }
                           success {
                             println("rh7_cluster_10.0-3 Tests Completed")
                             sendMail Email,'<h3>Tests Passed on  10.0-3 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-3 | Cluster | Passed'
                            }
                            unstable {
                               println("rh7_cluster_10.0-3 Tests Failed")
                               sendMail Email,'<h3>Some Tests Failed on 10.0-3 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-3 | Cluster | Failed'
                           }
                           }
             }
             stage('rh7_cluster_10.0-4'){
               options {timeout(time: 3, unit: 'HOURS')}
               agent { label 'dhfLinuxAgent'}
               steps{
                   catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhflinuxTests("10.0-4.4","Release")}
               }
               post{
                 always{
                     sh 'rm -rf $WORKSPACE/xdmp'
                   }
                           success {
                             println("rh7_cluster_10.0-4 Tests Completed")
                             sendMail Email,'<h3>Tests Passed on  10.0-4 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-4 | Cluster | Passed'
                            }
                            unstable {
                               println("rh7_cluster_10.0-4 Tests Failed")
                               sendMail Email,'<h3>Some Tests Failed on 10.0-4 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-4 | Cluster | Failed'
                           }
                           }
             }
             stage('rh7_cluster_10.0-5'){
                options {timeout(time: 3, unit: 'HOURS')}
                agent { label 'dhfLinuxAgent'}
                steps{
                  catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhflinuxTests("10.0-5.3","Release")}
                }
                post{
                  always{
                      sh 'rm -rf $WORKSPACE/xdmp'
                    }
                            success {
                              println("rh7_cluster_10.0-5 Tests Completed")
                              sendMail Email,'<h3>Tests Passed on  10.0-5 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-5 | Cluster | Passed'
                             }
                             unstable {
                                println("rh7_cluster_10.0-5 Tests Failed")
                                sendMail Email,'<h3>Some Tests Failed on 10.0-5 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-5 | Cluster | Failed'
                            }
                            }
              }
		stage('rh7_cluster_10.0-6'){
                options {timeout(time: 3, unit: 'HOURS')}
                agent { label 'dhfLinuxAgent'}
                steps{
                  catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhflinuxTests("10.0-6","Release")}
                }
                post{
                  always{
                      sh 'rm -rf $WORKSPACE/xdmp'
                    }
                            success {
                              println("rh7_cluster_10.0-6 Tests Completed")
                              sendMail Email,'<h3>Tests Passed on  10.0-6 ML Server Cluster </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-6 | Cluster | Passed'
                             }
                             unstable {
                                println("rh7_cluster_10.0-6 Tests Failed")
                                sendMail Email,'<h3>Some Tests Failed on 10.0-6 ML Server Cluster </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Linux RH7 | ML-10.0-6 | Cluster | Failed'
                            }
                            }
              }
		}
	}

        stage('example projects parallel'){
            when { expression {return params.regressions} }
            parallel{
            stage('dh5-example'){
                options {timeout(time: 3, unit: 'HOURS')}
                agent { label 'dhfLinuxAgent'}
                steps {
                  catchError(buildResult: 'SUCCESS', catchInterruptions: true){dh5Example()}
                }
                 post{
                 always{
                    sh 'rm -rf $WORKSPACE/xdmp';
                 }
                 success{
                    sendMail Email,'<h3>dh5example ran successfully on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'dh5-example on $BRANCH_NAME Passed'
                 }
                 unstable{
                    sendMail Email,'<h3>dh5example Failed on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create a bug and fix issues in the example project</h4>',false,'dh5-example on $BRANCH_NAME Failed'
                 }
                 }
            }
            stage('dhf-customhook'){
                options {timeout(time: 3, unit: 'HOURS')}
                agent { label 'dhfLinuxAgent'}
                steps{
                    catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhCustomHook()}
                 }
                 post{
                 always{
                    sh 'rm -rf $WORKSPACE/xdmp';
                 }
                 success{
                    sendMail Email,'<h3>dh5-customhook ran successfully on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'dh5-customhook on $BRANCH_NAME Passed'
                 }
                 unstable{
                    sendMail Email,'<h3>dh5-customhook Failed on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create a bug and fix issues in the example project</h4>',false,'dh5-customhook on $BRANCH_NAME Failed'
                 }
                 }
            }
            stage('mapping-example'){
                options {timeout(time: 3, unit: 'HOURS')}
                agent { label 'dhfLinuxAgent'}
                steps{
                  catchError(buildResult: 'SUCCESS', catchInterruptions: true){mappingExample()}
                 }
                 post{
                 always{
                    sh 'rm -rf $WORKSPACE/xdmp';
                 }
                 success{
                    sendMail Email,'<h3>mapping-example ran successfully on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'mapping-example on $BRANCH_NAME Passed'
                 }
                 unstable{
                    sendMail Email,'<h3>mapping-example Failed on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create a bug and fix issues in the example project</h4>',false,'mapping-example on $BRANCH_NAME Failed'
                 }
                 }
            }
            stage('smart-mastering-complete'){
                options {timeout(time: 3, unit: 'HOURS')}
                agent { label 'dhfLinuxAgent'}
                steps{
                  catchError(buildResult: 'SUCCESS', catchInterruptions: true){smartMastering()}
                 }
                 post{
                 always{
                    sh 'rm -rf $WORKSPACE/xdmp';
                 }
                 success{
                    sendMail Email,'<h3>smart-mastering-complete ran successfully on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'smart-mastering-complete on $BRANCH_NAME Passed'
                 }
                 unstable{
                    sendMail Email,'<h3>smart-mastering-complete Failed on the  branch $BRANCH_NAME </h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create a bug and fix issues in the example project</h4>',false,'smart-mastering-complete on $BRANCH_NAME Failed'
                 }
                 }
            }
		}
		}
          stage('Windows Core Parallel'){
            when { expression {return params.regressions} }
      	    parallel{
            stage('w10_SN_9.0-Nightly'){
                options {timeout(time: 3, unit: 'HOURS')}
        		agent { label 'dhfWinagent'}
        		steps{
                    catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhfWinTests("9.0","Latest")}
        		}
        			post{
        				always{
        				  	 bat 'RMDIR /S/Q xdmp'
        				  }
                          success {
                            println("w12_SN_9.0-nightly Tests Completed")
                            sendMail Email,'<h3>Tests Passed on Nigtly 9.0 ML Server on Windows Platform</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-9.0-Nightly | Single Node | Passed'
                           }
                           unstable {
                              println("w12_SN_9.0-nightly Tests Failed")
                              sendMail Email,'<h3>Some Tests Failed on Nightly 9.0 ML Server on Windows Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-9.0-Nightly | Single Node | Failed'
                          }
                          }
        		}
                stage('w10_SN_10.0-Nightly'){
                    options {timeout(time: 3, unit: 'HOURS')}
        			agent { label 'dhfWinagent'}
        			steps{
                      catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhfWinTests("10.0","Latest")}
        			}
        			post{
        				always{
        				  	 bat 'RMDIR /S/Q xdmp'
        				  }
                          success {
                            println("w12_SN_10.0-nightly Tests Completed")
                            sendMail Email,'<h3>Tests Passed on Nigtly 10.0 ML Server on Windows Platform</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-10.0-Nightly | Single Node | Passed'
                           }
                           unstable {
                              println("w12_SN_10.0-nightly Tests Failed")
                              sendMail Email,'<h3>Some Tests Failed on Nightly 10.0 ML Server on Windows Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-10.0-Nightly | Single Node | Failed'
                          }
                          }
        		}
        		stage('w10_SN_9.0-11'){
                    options {timeout(time: 3, unit: 'HOURS')}
        			agent { label 'dhfWinagent'}
        			steps{
                      catchError(buildResult: 'SUCCESS', catchInterruptions: true){dhfWinTests("9.0-11","Release")}
        			}
        			post{
        				always{
                               bat 'RMDIR /S/Q xdmp'
        				  }
                          success {
                            println("w12_SN_9.0-11 Tests Completed")
                            sendMail Email,'<h3>Tests Passed on Released 9.0 ML Server on Windows Platform</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-9.0-11 | Single Node | Passed'
                           }
                           unstable {
                              println("w12_SN_9.0-11 Tests Failed")
                              sendMail Email,'<h3>Some Tests Failed on Released 9.0 ML Server on Windows Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-9.0-11 | Single Node | Failed'
                          }
                          }
        		}
        		stage('w12_cluster_10.0-6'){
                    options {timeout(time: 3, unit: 'HOURS')}
        			agent { label 'dhfWinCluster'}
        			steps{
                     catchError(buildResult: 'SUCCESS', catchInterruptions: true){winParallel()}
        			}
        			post{
        				always{
        				  	bat 'RMDIR /S/Q xdmp'
        				  }
                          success {
                            println("w12_cluster_10.0-6 Tests Completed")
                            sendMail Email,'<h3>Tests Passed on Released 10.0 ML Server Cluster on Windows Platform</h3><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-10.0-5 | Cluster | Passed'
                           }
                           unstable {
                              println("w12_cluster_10.0-6 Tests Failed")
                              sendMail Email,'<h3>Some Tests Failed on Released 10.0 ML Server on Windows Platform </h3><h4><a href=${JENKINS_URL}/blue/organizations/jenkins/Datahub_CI/detail/$JOB_BASE_NAME/$BUILD_ID/tests><font color=red>Check the Test Report</font></a></h4><h4><a href=${RUN_DISPLAY_URL}>Check the Pipeline View</a></h4><h4> <a href=${BUILD_URL}/console> Check Console Output Here</a></h4><h4>Please create bugs for the failed regressions and fix them</h4>',false,'$BRANCH_NAME branch | Windows W2k12 | ML-10.0-6 | Cluster | Failed'
                          }
                          }
        		}

        		    }
        		}

	}
}
