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
/**
 * This library is intended to encapsulate all logic specific to Entity Services models. As of DHF 5.2.0, this logic is
 * spread around the DH codebase. It is expected that this will gradually be refactored so that all ES-specific logic
 * resides in this module to promote reuse and also simplify upgrades as Entity Services changes within MarkLogic.
 */

import config from "/com.marklogic.hub/config.mjs";
import hubUtils from "/data-hub/5/impl/hub-utils.mjs";

/*
{
  "falsyValues": true|false,
  "entityValidation": "doNotValidate" | "accept" | "reject",
  "mapping": true|false,
  "permission": {
      "enabled": false,
      "permissions": "data-hub-common-writer,update"
  }
}
 */
function getGlobalSetting(settingName) {
  const globalSettingsURI = "/config/globalSettings.json";
  xdmp.log("**getGlobalSetting**");
  const globalSettings = fn.head(hubUtils.invokeFunction(() => cts.doc(globalSettingsURI), config.FINALDATABASE));
  if (globalSettings) {
    const globalSettingsObj = globalSettings.toObject();
    xdmp.log("globalSettingsObj " + xdmp.describe(globalSettingsObj));
    if (globalSettingsObj[settingName]) {
      return globalSettingsObj[settingName];
    }
  }
  return undefined;
}

export default {
  getGlobalSetting
}
