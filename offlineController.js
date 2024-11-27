define([
  "vbsw/helpers/serviceWorkerHelpers",
  "persist/persistenceManager",
  "persist/persistenceStoreManager",
  "persist/defaultResponseProxy",
  "persist/persistenceUtils",
  "persist/fetchStrategies",
  "persist/impl/logger",
  "persist/oracleRestJsonShredding",
  "persist/simpleJsonShredding",
  "persist/queryHandlers",
  "persist/pouchDBPersistenceStoreFactory",
  "persist/impl/sql-where-parser.min",
  "resources/js/IldceoCacheStrategies",
  "snowflake-id",
  'pouchDB',
  "lodash"
], function (
  ServiceWorkerHelpers,
  PersistenceManager,
  PersistenceStoreManager,
  DefaultResponseProxy,
  PersistenceUtils,
  FetchStrategies,
  Logger,
  OracleRestJsonShredding,
  SimpleJsonShredding,
  QueryHandlers,
  PouchDBPersistenceStoreFactory,
  SqlWhereParser,
  IldceoCacheStrategies,
  SnowflakeId,
  PDUtils,
  Lodash
) {
  "use strict";

  const OBJ_ASSESSMENTS = {
    SCOPE: "/resources/latest/WxAssessment_c",
    STORE: "assessments",
    ID_FIELD: "Id",
  };

  const OBJ_ASSESSMENT_AREA_HIERARCHY_METADATA = {
    SCOPE: "/AssessmentAreaHierarchyMetad_c",
    STORE: "assessmentAreaHierarchyMetadata",
    ID_FIELD: "Id",
  };

  const OBJ_ASSESSMENT_AREA_METADATA = {
    SCOPE: "/AssessmentAreaMetaData_c",
    STORE: "assessmentAreaMetaData",
    ID_FIELD: "Id",
  };

  const OBJ_FND_STATIC_LOOKUPS = {
    SCOPE: "/fndStaticLookups",
    STORE: "fndStaticLookups",
    ID_FIELD: "LookupCode",
  };

  const OBJ_DELETE_ALMOBJ_GRAPH = {
    SCOPE: "/deleteALMObjGraph",
    STORE: "deleteALMObjGraph",
    ID_FIELD: "Result",
  };

  const OBJ_MEASURES = {
    SCOPE: "/Measure_c",
    STORE: "measures",
    ID_FIELD: "Id",
  };

  const OBJ_ASSESSMENT_LINES = {
    SCOPE: "/resources/latest/WxAssessmentLine_c",
    STORE: "assessmentLines",
    ID_FIELD: "Id",
  };

  const OBJ_ASSESSMENT_LINE_MEASURES = {
    SCOPE: "/AssessmentLineMeasure_c",
    STORE: "assessmentLineMeasures",
    ID_FIELD: "Id",
  };

  const OBJ_ASSESSMENT_LINE_DESCRIBE = {
    SCOPE: "/describe",
    STORE: "assessmentLineDescribe",
    ID_FIELD: "Resources",
  };

  const OBJ_ASSESSMENT_FUELTYPE = {
    SCOPE: "/WxFuelType_c",
    STORE: "fuelType",
    ID_FIELD: "Id",
  };

  const OBJ_WO_JOBS = {
    SCOPE: "/WxProject_c",
    STORE: "jobs",
    ID_FIELD: "Id",
  };

  const OBJ_WO_WORKORDERS = {
    SCOPE: "/resources/latest/WxWorkOrder_c",
    STORE: "workOrders",
    ID_FIELD: "Id",
  };

  const OBJ_WO_WORKORDER_LINES = {
    SCOPE: "/resources/latest/WxWorkOrderLines_c",
    STORE: "workOrderLines",
    ID_FIELD: "Id",
  };

  const OBJ_WO_WORKORDER_LINE_ITEMS = {
    SCOPE: "/resources/latest/WxWorkLineItem_c",
    STORE: "workOrderLineItems",
    ID_FIELD: "Id",
  };

  const OBJ_WOCHANGE_REQUEST = {
    SCOPE: "/resources/latest/WxWOChangeRequest_c",
    STORE: "WxWOChangeRequest",
    ID_FIELD: "Id",
  };

  const OBJ_WOLINE_PACKAGE = {
    SCOPE: "/resources/latest/WxWOLinePkg_c",
    STORE: "WxWOLinePkg",
    ID_FIELD: "Id",
  };

  const OBJ_WOLINE_PACKAGE_TASK = {
    SCOPE: "/resources/latest/WxWOLinePkgTasks_c",
    STORE: "WxWOLinePkgTasks",
    ID_FIELD: "Id",
  };

  const OBJ_INSPECTION = {
    SCOPE: "(/resources/latest/WxInspection_c/)([0-9]*)$",
    STORE: "WxInspection",
    ID_FIELD: "Id",
  };

  const OBJ_INSPECTIONLINE = {
    SCOPE: "/resources/latest/WxInspectionLine_c",
    STORE: "WxInspectionLine",
    ID_FIELD: "Id",
  };

  const OBJ_WXAGENCY_QA_MONITORING = {
    SCOPE: "/resources/latest/WxAgencyQAMonitoring_c",
    STORE: "WxAgencyQAMonitoring",
    ID_FIELD: "Id",
  };

  const OBJ_WXCONTRACTOR_ORG = {
    SCOPE: "/resources/latest/WxContractorOrg_c",
    STORE: "WxContractorOrg",
    ID_FIELD: "Id",
  };

  const OBJ_PARTNERS = {
    SCOPE: "/resources/latest/partners",
    STORE: "partners",
    ID_FIELD: "PartyId",
  };

  const OBJ_ASSESSMENT_FILEATTACHINFO = {
    SCOPE: "/WxFileAttachInfo_c",
    STORE: "fileAttachInfo",
    ID_FIELD: "Id",
  };

  const OBJ_BATCH = {
    SCOPE: ".+(?=/latest/$).+",
  };
  //SCOPE: '.+(?=\/latest$).+'
  const OBJ_URI_PREFIX = "/resources/latest";

  // store to keep log offline and their corresponding OEC id's post sync
  const OBJ_SYNC_MAP = {
    STORE: "syncMap",
  };

  const OBJ_DATA_LOG = {
    STORE: "dataLog"
  }
  let attachmentDetailsStore = null;
  let attachmentFilesStore = null;
  class OfflineController {
    constructor() {
      //attachment pouchdb object initializer
      this.attachmentDetails = new PDUtils("attachmentDetails");
      this.attachmentFiles = new PDUtils("attachmentFiles");
      attachmentDetailsStore = this.attachmentDetails;
      attachmentFilesStore = this.attachmentFiles;

      //end
      var self = this;

      // Logger.option("level", Logger.LEVEL_LOG);
      // Logger.option("writer", console);

      PersistenceStoreManager.registerDefaultStoreFactory(
        PouchDBPersistenceStoreFactory
      );

      PersistenceStoreManager.registerStoreFactory(
        OBJ_SYNC_MAP.STORE,
        PouchDBPersistenceStoreFactory
      );

      PersistenceStoreManager.registerStoreFactory(
        OBJ_DATA_LOG.STORE,
        PouchDBPersistenceStoreFactory
      );

      PersistenceManager.init().then(() => {
        //Assessment stores code end

        // storing dummy data in sync map for fixing issue with 1st aftersync map
        PersistenceStoreManager.openStore(OBJ_SYNC_MAP.STORE).then((store) => {
          store.upsert(self.generateUUID(), JSON.parse("{}"), 12345);
        });

        //Assessment stores code start
        PersistenceManager.register({
          scope: OBJ_ASSESSMENTS.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_ASSESSMENTS.STORE,
                OBJ_ASSESSMENTS.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_ASSESSMENTS.STORE
            ),
            requestHandlerOverride: {
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then((data) => {
                      const editedRecordId = _getRequestUrlId(data.url);

                      const editedRecordData = JSON.parse(data.body.text);

                      PersistenceStoreManager.openStore(
                        OBJ_ASSESSMENTS.STORE
                      ).then((store) => {
                        store.findByKey(editedRecordId).then((storeRecord) => {
                          //("000 handlePatch storeRecord", storeRecord);
                          storeRecord = { ...storeRecord, ...editedRecordData };

                          store.upsert(
                            editedRecordId,
                            JSON.parse("{}"),
                            storeRecord
                          );
                          data.status = 200;
                          data.statusText = "OK";
                          data.body.text = JSON.stringify(storeRecord);

                          resolve(PersistenceUtils.responseFromJSON(data));
                        });
                      });
                    });
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_ASSESSMENT_LINE_DESCRIBE.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_ASSESSMENT_LINE_DESCRIBE.STORE,
                OBJ_ASSESSMENT_LINE_DESCRIBE.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_ASSESSMENT_LINE_DESCRIBE.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_ASSESSMENT_FUELTYPE.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_ASSESSMENT_FUELTYPE.STORE,
                OBJ_ASSESSMENT_FUELTYPE.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_ASSESSMENT_FUELTYPE.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_ASSESSMENT_FILEATTACHINFO.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_ASSESSMENT_FILEATTACHINFO.STORE,
                OBJ_ASSESSMENT_FILEATTACHINFO.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_ASSESSMENT_FILEATTACHINFO.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });
        PersistenceManager.register({
          scope: OBJ_ASSESSMENT_AREA_HIERARCHY_METADATA.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_ASSESSMENT_AREA_HIERARCHY_METADATA.STORE,
                OBJ_ASSESSMENT_AREA_HIERARCHY_METADATA.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_ASSESSMENT_AREA_HIERARCHY_METADATA.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_ASSESSMENT_AREA_METADATA.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_ASSESSMENT_AREA_METADATA.STORE,
                OBJ_ASSESSMENT_AREA_METADATA.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_ASSESSMENT_AREA_METADATA.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_FND_STATIC_LOOKUPS.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_FND_STATIC_LOOKUPS.STORE,
                OBJ_FND_STATIC_LOOKUPS.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_FND_STATIC_LOOKUPS.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_MEASURES.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_MEASURES.STORE,
                OBJ_MEASURES.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_MEASURES.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_DELETE_ALMOBJ_GRAPH.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            requestHandlerOverride: {
              handlePost: function (request) {
                //("000 handlePost");
                request = request.clone();
                return new Promise((resolve) => {
                  //('000 handlePost online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      (requestData) => {
                        //("000 Inside PersistenceUtils");
                        //(requestData);

                        PersistenceStoreManager.openStore(
                          OBJ_DELETE_ALMOBJ_GRAPH.STORE
                        ).then((store) => {
                          store.upsert(
                            self.generateUUID(),
                            JSON.parse("{}"),
                            JSON.parse(requestData.body.text)
                          );
                        });

                        resolve(PersistenceUtils.responseFromJSON(requestData));
                      }
                    );
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_ASSESSMENT_LINES.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_ASSESSMENT_LINES.STORE,
                OBJ_ASSESSMENT_LINES.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_ASSESSMENT_LINES.STORE
            ),
            requestHandlerOverride: {
              handlePost: function (request) {
                //("000 handlePost");
                request = request.clone();
                return new Promise((resolve) => {
                  //('000 handlePost online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      (requestData) => {
                        let newRecordWithTempId = JSON.parse(
                          requestData.body.text
                        );
                        const tempId = self.generateUUID(); //Math.floor(Math.random() * 1000000)()
                        newRecordWithTempId.Id = tempId;
                        newRecordWithTempId.NewTempId = tempId;

                        // push back into request
                        requestData.body.text =
                          JSON.stringify(newRecordWithTempId);

                        requestData.status = 202;
                        requestData.statusText = "OK";

                        requestData.headers["content-type"] =
                          "application/json";
                        requestData.headers[
                          "x-oracle-jscpt-cache-expiration-date"
                        ] = "";

                        // if the request contains an ETag then we have to generate a new one
                        var ifMatch = requestData.headers["if-match"];
                        var ifNoneMatch = requestData.headers["if-none-match"];

                        if (ifMatch || ifNoneMatch) {
                          var randomInt = Math.floor(Math.random() * 1000000); // @RandomNumberOK - Only used to generate ETag while offline
                          requestData.headers["etag"] = (
                            Date.now() + randomInt
                          ).toString();
                          requestData.headers["x-oracle-jscpt-etag-generated"] =
                            requestData.headers["etag"];
                          delete requestData.headers["if-match"];
                          delete requestData.headers["if-none-match"];
                        }

                        PersistenceStoreManager.openStore(
                          OBJ_ASSESSMENT_LINES.STORE
                        ).then((store) => {
                          store.upsert(
                            tempId,
                            JSON.parse("{}"),
                            JSON.parse(requestData.body.text)
                          );
                        });

                        resolve(PersistenceUtils.responseFromJSON(requestData));
                      }
                    );
                  }
                });
              },
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then((data) => {
                      //("000 handlePatch data", data);
                      const editedRecordId = _getRequestUrlId(data.url);
                      //("000 handlePatch editedRecordId", editedRecordId);
                      const editedRecordData = JSON.parse(data.body.text);
                      //("000 handlePatch editedRecordData", editedRecordData);

                      PersistenceStoreManager.openStore(
                        OBJ_ASSESSMENT_LINES.STORE
                      ).then((store) => {
                        store.findByKey(editedRecordId).then((storeRecord) => {
                          //("000 handlePatch storeRecord", storeRecord);
                          storeRecord = { ...storeRecord, ...editedRecordData };
                          //(

                          store.upsert(
                            editedRecordId,
                            JSON.parse("{}"),
                            storeRecord
                          );
                          data.status = 200;
                          data.statusText = "OK";
                          data.body.text = JSON.stringify(storeRecord);

                          resolve(PersistenceUtils.responseFromJSON(data));
                        });
                      });
                    });

                    /*
                        // original code - done using async-await - Sriram
                        PersistenceUtils.requestToJSON(request).then(async (data) => {
                          //("000 handlePatch data", data);
  
                          let editedRecordId = _getRequestUrlId(data.url);
                          //("000 handlePatch editedRecordId", editedRecordId);
                          let editedRecordData = JSON.parse(data.body.text);
                          //("000 handlePatch editedRecordData", editedRecordData);
  
                          const store = await PersistenceStoreManager.openStore(OBJ_ASSESSMENT_LINES.STORE);
                          let storeRecord = await store.findByKey(editedRecordId);
                          //("000 handlePatch storeRecord", storeRecord);
  
                          storeRecord = { ...storeRecord, ...editedRecordData };
  
                          //("000 handlePatch OBJ_ASSESSMENT_LINES requestData storing...", storeRecord);
                          store.upsert(editedRecordId, JSON.parse('{}'), storeRecord);                       
  
                        });
  
                        let init = {
                          'status': 200,
                          'statusText': 'Edit will be processed when online'
                        };
                        return resolve(new Response(null, init));
                        */
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_ASSESSMENT_LINE_MEASURES.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_ASSESSMENT_LINE_MEASURES.STORE,
                OBJ_ASSESSMENT_LINE_MEASURES.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_ASSESSMENT_LINE_MEASURES.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_BATCH.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            requestHandlerOverride: {
              handlePost: function (request) {
                //("000 handlePost");
                request = request.clone();
                return new Promise((resolve) => {
                  //('000 handlePost online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    PersistenceUtils.requestToJSON(request).then(
                      (requestData) => {
                        //("000 Inside PersistenceUtils - Online");
                        //(requestData);

                        let newRecord = JSON.parse(requestData.body.text);
                        //("000 handlePost newRecord - Online", newRecord);

                        if (
                          newRecord.hasOwnProperty("parts") &&
                          newRecord.parts.length
                        ) {
                          for (const part of newRecord.parts) {
                            //("000 handlePost part - Online", part);
                            if (part.operation == "delete") {
                              const deletedItemId = _getRequestUrlId(part.path);
                              //('000 handlePost deletedItemId - Online', deletedItemId);

                              if (deletedItemId) {
                                // delete record from cache

                                //('000 handlePost deleting - Online', deletedItemId);
                                if (
                                  (OBJ_URI_PREFIX + part.path).includes(
                                    OBJ_ASSESSMENT_LINES.SCOPE
                                  )
                                ) {
                                  _deleteClientCachedObject(
                                    part,
                                    OBJ_ASSESSMENT_LINES.STORE,
                                    OBJ_ASSESSMENT_LINES.ID_FIELD,
                                    deletedItemId
                                  );
                                } else if (
                                  part.path.includes(
                                    OBJ_ASSESSMENT_LINE_MEASURES.SCOPE
                                  )
                                ) {
                                  _deleteClientCachedObject(
                                    part,
                                    OBJ_ASSESSMENT_LINE_MEASURES.STORE,
                                    OBJ_ASSESSMENT_LINE_MEASURES.ID_FIELD,
                                    deletedItemId
                                  );
                                }
                              }
                            }
                          }
                        }
                      }
                    );

                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      async (requestData) => {
                        //("000 Inside PersistenceUtils");
                        //(requestData);

                        let newRecord = JSON.parse(requestData.body.text);
                        //("000 handlePost newRecord", newRecord);

                        if (
                          newRecord.hasOwnProperty("parts") &&
                          newRecord.parts.length
                        ) {
                          for (const part of newRecord.parts) {
                            //("000 handlePost part", part);
                            if (part.operation == "delete") {
                              const deletedItemId = _getRequestUrlId(part.path);
                              //('000 handlePost deletedItemId', deletedItemId);

                              if (deletedItemId) {
                                // delete record from cache

                                //('000 handlePost deleting', deletedItemId);
                                if (
                                  (OBJ_URI_PREFIX + part.path).includes(
                                    OBJ_ASSESSMENT_LINES.SCOPE
                                  )
                                ) {
                                  _deleteClientCachedObject(
                                    part,
                                    OBJ_ASSESSMENT_LINES.STORE,
                                    OBJ_ASSESSMENT_LINES.ID_FIELD,
                                    deletedItemId
                                  );
                                } else if (
                                  part.path.includes(
                                    OBJ_ASSESSMENT_LINE_MEASURES.SCOPE
                                  )
                                ) {
                                  _deleteClientCachedObject(
                                    part,
                                    OBJ_ASSESSMENT_LINE_MEASURES.STORE,
                                    OBJ_ASSESSMENT_LINE_MEASURES.ID_FIELD,
                                    deletedItemId
                                  );
                                }
                              }
                            } else if (part.operation == "create") {
                              // only do this for the AssessmentLineMeasures
                              if (
                                part.path.includes(
                                  OBJ_ASSESSMENT_LINE_MEASURES.SCOPE
                                )
                              ) {
                                let tempId = self.generateUUID();
                                part.payload.Id = tempId;
                                part.payload.NewTempId = tempId;
                                const measureStore =
                                  await PersistenceStoreManager.openStore(
                                    OBJ_MEASURES.STORE
                                  );
                                const rec = await measureStore.findByKey(
                                  part.payload.Measure_Id_c
                                );
                                part.payload.Measure_c = rec.RecordName;
                                const assLineMeasureStore =
                                  await PersistenceStoreManager.openStore(
                                    OBJ_ASSESSMENT_LINE_MEASURES.STORE
                                  );
                                let keysOfStore =
                                  await assLineMeasureStore.keys();
                                if (keysOfStore.includes(tempId)) {
                                  tempId = self.generateUUID();
                                }
                                await assLineMeasureStore.upsert(
                                  tempId,
                                  JSON.parse("{}"),
                                  part.payload
                                );
                                // PersistenceStoreManager.openStore(OBJ_MEASURES.STORE).then((measureStore) => {
                                //   measureStore.findByKey(part.payload.Measure_Id_c).then((rec) => {
                                //     part.payload.Measure_c = rec.RecordName;
                                //     PersistenceStoreManager.openStore(OBJ_ASSESSMENT_LINE_MEASURES.STORE).then(
                                //       async (assLineMeasureStore) => {
                                //         let keysOfStore = await assLineMeasureStore.keys();
                                //         if (keysOfStore.includes(tempId)) {
                                //           tempId = self.generateUUID();
                                //         }
                                //         assLineMeasureStore.upsert(tempId, JSON.parse("{}"), part.payload);
                                //       }
                                //     );
                                //   });
                                // });
                              }
                            }
                          }
                        }

                        // push back into request
                        requestData.body.text = JSON.stringify(newRecord);

                        requestData.status = 202;
                        requestData.statusText = "OK";

                        requestData.headers["content-type"] =
                          "application/json";
                        requestData.headers[
                          "x-oracle-jscpt-cache-expiration-date"
                        ] = "";

                        // if the request contains an ETag then we have to generate a new one
                        var ifMatch = requestData.headers["if-match"];
                        var ifNoneMatch = requestData.headers["if-none-match"];

                        if (ifMatch || ifNoneMatch) {
                          var randomInt = Math.floor(Math.random() * 1000000); // @RandomNumberOK - Only used to generate ETag while offline
                          requestData.headers["etag"] = (
                            Date.now() + randomInt
                          ).toString();
                          requestData.headers["x-oracle-jscpt-etag-generated"] =
                            requestData.headers["etag"];
                          delete requestData.headers["if-match"];
                          delete requestData.headers["if-none-match"];
                        }

                        //("000 handlePost requestData2", requestData);

                        resolve(PersistenceUtils.responseFromJSON(requestData));
                      }
                    );
                  }
                });
              },
            },
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        //Assessment stores code end

        // Work Orders and inspections stores code start
        PersistenceManager.register({
          scope: OBJ_WO_JOBS.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_WO_JOBS.STORE,
                OBJ_WO_JOBS.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_WO_JOBS.STORE
            ),
            requestHandlerOverride: {
              handlePost: function (request) {
                //("000 handlePost");
                request = request.clone();
                return new Promise((resolve) => {
                  //('000 handlePost online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      (requestData) => {
                        //("000 Inside PersistenceUtils");
                        //(requestData);

                        let newRecordWithTempId = JSON.parse(
                          requestData.body.text
                        );
                        const tempId = self.generateUUID(); //Math.floor(Math.random() * 1000000)()
                        newRecordWithTempId.Id = tempId;
                        newRecordWithTempId.NewTempId = tempId;

                        // push back into request
                        requestData.body.text =
                          JSON.stringify(newRecordWithTempId);

                        requestData.status = 202;
                        requestData.statusText = "OK";

                        requestData.headers["content-type"] =
                          "application/json";
                        requestData.headers[
                          "x-oracle-jscpt-cache-expiration-date"
                        ] = "";

                        // if the request contains an ETag then we have to generate a new one
                        var ifMatch = requestData.headers["if-match"];
                        var ifNoneMatch = requestData.headers["if-none-match"];

                        if (ifMatch || ifNoneMatch) {
                          var randomInt = Math.floor(Math.random() * 1000000); // @RandomNumberOK - Only used to generate ETag while offline
                          requestData.headers["etag"] = (
                            Date.now() + randomInt
                          ).toString();
                          requestData.headers["x-oracle-jscpt-etag-generated"] =
                            requestData.headers["etag"];
                          delete requestData.headers["if-match"];
                          delete requestData.headers["if-none-match"];
                        }

                        //("000 handlePost requestData2", requestData);
                        //("000 handlePost requestData2 storing...", JSON.parse(requestData.body.text));

                        PersistenceStoreManager.openStore(
                          OBJ_WO_JOBS.STORE
                        ).then((store) => {
                          store.upsert(
                            tempId,
                            JSON.parse("{}"),
                            JSON.parse(requestData.body.text)
                          );
                        });

                        resolve(PersistenceUtils.responseFromJSON(requestData));
                      }
                    );
                  }
                });
              },
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      async (data) => {
                        //("000 handlePatch data", data);

                        let editedRecordId = _getRequestUrlId(data.url);
                        //("000 handlePatch editedRecordId", editedRecordId);
                        let editedRecordData = JSON.parse(data.body.text);
                        //("000 handlePatch editedRecordData", editedRecordData);

                        const store = await PersistenceStoreManager.openStore(
                          OBJ_WO_JOBS.STORE
                        );
                        let storeRecord = await store.findByKey(editedRecordId);
                        //("000 handlePatch storeRecord", storeRecord);

                        storeRecord = { ...storeRecord, ...editedRecordData };

                        //("000 handlePatch requestData storing...", storeRecord);
                        store.upsert(
                          editedRecordId,
                          JSON.parse("{}"),
                          storeRecord
                        );
                      }
                    );

                    let init = {
                      status: 200,
                      statusText: "Edit will be processed when online",
                    };
                    return resolve(new Response(null, init));
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_WO_WORKORDERS.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_WO_WORKORDERS.STORE,
                OBJ_WO_WORKORDERS.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_WO_WORKORDERS.STORE
            ),
            requestHandlerOverride: {
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      async (data) => {
                        //("000 handlePatch data", data);

                        let editedRecordId = _getRequestUrlId(data.url);
                        //("000 handlePatch editedRecordId", editedRecordId);

                        let editedRecordData = JSON.parse(data.body.text);
                        //("000 handlePatch editedRecordData", editedRecordData);

                        const store = await PersistenceStoreManager.openStore(
                          OBJ_WO_WORKORDERS.STORE
                        );
                        let storeRecord = await store.findByKey(editedRecordId);
                        //("000 handlePatch storeRecord", storeRecord);

                        storeRecord = { ...storeRecord, ...editedRecordData };

                        //("000 handlePatch requestData storing...", storeRecord);
                        store.upsert(
                          parseInt(editedRecordId),
                          JSON.parse("{}"),
                          storeRecord
                        );
                      }
                    );

                    let init = {
                      status: 200,
                      statusText: "Edit will be processed when online",
                    };
                    return resolve(new Response(null, init));
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_WO_WORKORDER_LINES.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_WO_WORKORDER_LINES.STORE,
                OBJ_WO_WORKORDER_LINES.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_WO_WORKORDER_LINES.STORE
            ),
            requestHandlerOverride: {
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      async (data) => {
                        //("000 handlePatch data", data);

                        let editedRecordId = _getRequestUrlId(data.url);
                        //("000 handlePatch editedRecordId", editedRecordId);

                        let editedRecordData = JSON.parse(data.body.text);
                        //("000 handlePatch editedRecordData", editedRecordData);

                        const store = await PersistenceStoreManager.openStore(
                          OBJ_WO_WORKORDER_LINES.STORE
                        );
                        let storeRecord = await store.findByKey(editedRecordId);
                        //("000 handlePatch storeRecord", storeRecord);

                        storeRecord = { ...storeRecord, ...editedRecordData };

                        //("000 handlePatch requestData storing...", storeRecord);
                        store.upsert(
                          parseInt(editedRecordId),
                          JSON.parse("{}"),
                          storeRecord
                        );
                      }
                    );

                    let init = {
                      status: 200,
                      statusText: "Edit will be processed when online",
                    };
                    return resolve(new Response(null, init));
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_WO_WORKORDER_LINE_ITEMS.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_WO_WORKORDER_LINE_ITEMS.STORE,
                OBJ_WO_WORKORDER_LINE_ITEMS.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_WO_WORKORDER_LINE_ITEMS.STORE
            ),
            requestHandlerOverride: {
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      async (data) => {
                        //("000 handlePatch data", data);

                        let editedRecordId = _getRequestUrlId(data.url);
                        //("000 handlePatch editedRecordId", editedRecordId);

                        let editedRecordData = JSON.parse(data.body.text);
                        //("000 handlePatch editedRecordData", editedRecordData);

                        const store = await PersistenceStoreManager.openStore(
                          OBJ_WO_WORKORDER_LINE_ITEMS.STORE
                        );
                        let storeRecord = await store.findByKey(editedRecordId);
                        //("000 handlePatch storeRecord", storeRecord);

                        storeRecord = { ...storeRecord, ...editedRecordData };

                        //("000 handlePatch requestData storing...", storeRecord);
                        store.upsert(
                          parseInt(editedRecordId),
                          JSON.parse("{}"),
                          storeRecord
                        );
                      }
                    );

                    let init = {
                      status: 200,
                      statusText: "Edit will be processed when online",
                    };
                    return resolve(new Response(null, init));
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_WOCHANGE_REQUEST.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_WOCHANGE_REQUEST.STORE,
                OBJ_WOCHANGE_REQUEST.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_WOCHANGE_REQUEST.STORE
            ),
            requestHandlerOverride: {
              handlePost: function (request) {
                //("000 handlePost");
                request = request.clone();
                return new Promise((resolve) => {
                  //('000 handlePost online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      (requestData) => {
                        //("000 Inside PersistenceUtils");
                        //(requestData);

                        let newRecordWithTempId = JSON.parse(
                          requestData.body.text
                        );
                        const tempId = self.generateUUID(); //Math.floor(Math.random() * 1000000)()
                        newRecordWithTempId.Id = tempId;
                        newRecordWithTempId.NewTempId = tempId;

                        // push back into request
                        requestData.body.text =
                          JSON.stringify(newRecordWithTempId);

                        requestData.status = 202;
                        requestData.statusText = "OK";

                        requestData.headers["content-type"] =
                          "application/json";
                        requestData.headers[
                          "x-oracle-jscpt-cache-expiration-date"
                        ] = "";

                        // if the request contains an ETag then we have to generate a new one
                        var ifMatch = requestData.headers["if-match"];
                        var ifNoneMatch = requestData.headers["if-none-match"];

                        if (ifMatch || ifNoneMatch) {
                          var randomInt = Math.floor(Math.random() * 1000000); // @RandomNumberOK - Only used to generate ETag while offline
                          requestData.headers["etag"] = (
                            Date.now() + randomInt
                          ).toString();
                          requestData.headers["x-oracle-jscpt-etag-generated"] =
                            requestData.headers["etag"];
                          delete requestData.headers["if-match"];
                          delete requestData.headers["if-none-match"];
                        }

                        //("000 handlePost requestData2", requestData);
                        //("000 handlePost requestData2 storing...", JSON.parse(requestData.body.text));

                        PersistenceStoreManager.openStore(
                          OBJ_WOCHANGE_REQUEST.STORE
                        ).then((store) => {
                          store.upsert(
                            tempId,
                            JSON.parse("{}"),
                            JSON.parse(requestData.body.text)
                          );
                        });

                        resolve(PersistenceUtils.responseFromJSON(requestData));
                      }
                    );
                  }
                });
              },
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      async (data) => {
                        //("000 handlePatch data", data);

                        let editedRecordId = _getRequestUrlId(data.url);
                        //("000 handlePatch editedRecordId", editedRecordId);
                        let editedRecordData = JSON.parse(data.body.text);
                        //("000 handlePatch editedRecordData", editedRecordData);

                        const store = await PersistenceStoreManager.openStore(
                          OBJ_WOCHANGE_REQUEST.STORE
                        );
                        let storeRecord = await store.findByKey(editedRecordId);
                        //("000 handlePatch storeRecord", storeRecord);

                        storeRecord = { ...storeRecord, ...editedRecordData };

                        //("000 handlePatch requestData storing...", storeRecord);
                        store.upsert(
                          editedRecordId,
                          JSON.parse("{}"),
                          storeRecord
                        );
                      }
                    );

                    let init = {
                      status: 200,
                      statusText: "Edit will be processed when online",
                    };
                    return resolve(new Response(null, init));
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_WOLINE_PACKAGE.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_WOLINE_PACKAGE.STORE,
                OBJ_WOLINE_PACKAGE.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_WOLINE_PACKAGE.STORE
            ),
            requestHandlerOverride: {
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      async (data) => {
                        //("000 handlePatch data", data);

                        let editedRecordId = _getRequestUrlId(data.url);
                        //("000 handlePatch editedRecordId", editedRecordId);

                        let editedRecordData = JSON.parse(data.body.text);
                        //("000 handlePatch editedRecordData", editedRecordData);

                        const store = await PersistenceStoreManager.openStore(
                          OBJ_WOLINE_PACKAGE.STORE
                        );
                        let storeRecord = await store.findByKey(editedRecordId);
                        //("000 handlePatch storeRecord", storeRecord);

                        storeRecord = { ...storeRecord, ...editedRecordData };

                        //("000 handlePatch requestData storing...", storeRecord);
                        store.upsert(
                          parseInt(editedRecordId),
                          JSON.parse("{}"),
                          storeRecord
                        );
                      }
                    );

                    let init = {
                      status: 200,
                      statusText: "Edit will be processed when online",
                    };
                    return resolve(new Response(null, init));
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_WOLINE_PACKAGE_TASK.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_WOLINE_PACKAGE_TASK.STORE,
                OBJ_WOLINE_PACKAGE_TASK.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_WOLINE_PACKAGE_TASK.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_WXAGENCY_QA_MONITORING.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_WXAGENCY_QA_MONITORING.STORE,
                OBJ_WXAGENCY_QA_MONITORING.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_WXAGENCY_QA_MONITORING.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_WXCONTRACTOR_ORG.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_WXCONTRACTOR_ORG.STORE,
                OBJ_WXCONTRACTOR_ORG.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_WXCONTRACTOR_ORG.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_PARTNERS.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_PARTNERS.STORE,
                OBJ_PARTNERS.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_PARTNERS.STORE
            ),
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_INSPECTION.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_INSPECTION.STORE,
                OBJ_INSPECTION.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_INSPECTION.STORE
            ),
            requestHandlerOverride: {
              /*
                  handlePost: function (request) {
                    //("000 handlePost");
                    request = request.clone();
                    return new Promise(resolve => {
                      //('000 handlePost online status for ', request);
                      if (PersistenceManager.isOnline()) {
                        resolve(PersistenceManager.browserFetch(request));
                      }
                      else {
                        PersistenceUtils.requestToJSON(request).then((requestData) => {
  
                          //("000 Inside PersistenceUtils");
                          //(requestData);
  
                          let newRecordWithTempId = JSON.parse(requestData.body.text);
                          const tempId = self.generateUUID(); //Math.floor(Math.random() * 1000000)()
                          newRecordWithTempId.Id = tempId;
                          newRecordWithTempId.NewTempId = tempId;
  
                          // push back into request
                          requestData.body.text = JSON.stringify(newRecordWithTempId);
  
                          requestData.status = 202;
                          requestData.statusText = 'OK';
  
                          requestData.headers['content-type'] = 'application/json';
                          requestData.headers['x-oracle-jscpt-cache-expiration-date'] = '';
  
                          // if the request contains an ETag then we have to generate a new one
                          var ifMatch = requestData.headers['if-match'];
                          var ifNoneMatch = requestData.headers['if-none-match'];
  
                          if (ifMatch || ifNoneMatch) {
                            var randomInt = Math.floor(Math.random() * 1000000); // @RandomNumberOK - Only used to generate ETag while offline
                            requestData.headers['etag'] = (Date.now() + randomInt).toString();
                            requestData.headers['x-oracle-jscpt-etag-generated'] = requestData.headers['etag'];
                            delete requestData.headers['if-match'];
                            delete requestData.headers['if-none-match'];
                          }
  
                          //("000 handlePost requestData2", requestData);
                          //("000 handlePost requestData2 storing...", JSON.parse(requestData.body.text));
  
                          PersistenceStoreManager.openStore(OBJ_INSPECTION.STORE).then((store) => {
                            store.upsert(tempId, JSON.parse('{}'), JSON.parse(requestData.body.text));
                          });
  
                          resolve(PersistenceUtils.responseFromJSON(requestData));
  
                        });
                      }
                    });
                  },
                  */
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      async (data) => {
                        //("000 handlePatch data", data);

                        let editedRecordId = _getRequestUrlId(data.url);
                        //("000 handlePatch editedRecordId", editedRecordId);
                        let editedRecordData = JSON.parse(data.body.text);
                        //("000 handlePatch editedRecordData", editedRecordData);

                        const store = await PersistenceStoreManager.openStore(
                          OBJ_INSPECTION.STORE
                        );
                        let storeRecord = await store.findByKey(editedRecordId);
                        //("000 handlePatch storeRecord", storeRecord);

                        storeRecord = { ...storeRecord, ...editedRecordData };

                        //("000 handlePatch requestData storing...", storeRecord);
                        store.upsert(
                          editedRecordId,
                          JSON.parse("{}"),
                          storeRecord
                        );
                      }
                    );

                    let init = {
                      status: 200,
                      statusText: "Edit will be processed when online",
                    };
                    return resolve(new Response(null, init));
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        PersistenceManager.register({
          scope: OBJ_INSPECTIONLINE.SCOPE,
        }).then(function (registration) {
          let responseProxy = DefaultResponseProxy.getResponseProxy({
            jsonProcessor: {
              shredder: OracleRestJsonShredding.getShredder(
                OBJ_INSPECTIONLINE.STORE,
                OBJ_INSPECTIONLINE.ID_FIELD
              ),
              unshredder: OracleRestJsonShredding.getUnshredder(),
            },
            queryHandler: QueryHandlers.getOracleRestQueryHandler(
              OBJ_INSPECTIONLINE.STORE
            ),
            requestHandlerOverride: {
              handlePost: function (request) {
                //("000 handlePost");
                request = request.clone();
                return new Promise((resolve) => {
                  //('000 handlePost online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      (requestData) => {
                        //("000 Inside PersistenceUtils");
                        //(requestData);

                        let newRecordWithTempId = JSON.parse(
                          requestData.body.text
                        );
                        const tempId = self.generateUUID(); //Math.floor(Math.random() * 1000000)()
                        newRecordWithTempId.Id = tempId;
                        newRecordWithTempId.NewTempId = tempId;

                        // push back into request
                        requestData.body.text =
                          JSON.stringify(newRecordWithTempId);

                        requestData.status = 202;
                        requestData.statusText = "OK";

                        requestData.headers["content-type"] =
                          "application/json";
                        requestData.headers[
                          "x-oracle-jscpt-cache-expiration-date"
                        ] = "";

                        // if the request contains an ETag then we have to generate a new one
                        var ifMatch = requestData.headers["if-match"];
                        var ifNoneMatch = requestData.headers["if-none-match"];

                        if (ifMatch || ifNoneMatch) {
                          var randomInt = Math.floor(Math.random() * 1000000); // @RandomNumberOK - Only used to generate ETag while offline
                          requestData.headers["etag"] = (
                            Date.now() + randomInt
                          ).toString();
                          requestData.headers["x-oracle-jscpt-etag-generated"] =
                            requestData.headers["etag"];
                          delete requestData.headers["if-match"];
                          delete requestData.headers["if-none-match"];
                        }

                        //("000 handlePost requestData2", requestData);
                        //("000 handlePost requestData2 storing...", JSON.parse(requestData.body.text));

                        PersistenceStoreManager.openStore(
                          OBJ_INSPECTIONLINE.STORE
                        ).then((store) => {
                          store.upsert(
                            tempId,
                            JSON.parse("{}"),
                            JSON.parse(requestData.body.text)
                          );
                        });

                        resolve(PersistenceUtils.responseFromJSON(requestData));
                      }
                    );
                  }
                });
              },
              handlePatch: function (request) {
                return new Promise((resolve) => {
                  //('000 handlePatch online status for ', request);
                  if (PersistenceManager.isOnline()) {
                    resolve(PersistenceManager.browserFetch(request));
                  } else {
                    PersistenceUtils.requestToJSON(request).then(
                      async (data) => {
                        //("000 handlePatch data", data);

                        let editedRecordId = _getRequestUrlId(data.url);
                        //("000 handlePatch editedRecordId", editedRecordId);
                        let editedRecordData = JSON.parse(data.body.text);
                        //("000 handlePatch editedRecordData", editedRecordData);

                        const store = await PersistenceStoreManager.openStore(
                          OBJ_INSPECTIONLINE.STORE
                        );
                        let storeRecord = await store.findByKey(editedRecordId);
                        //("000 handlePatch storeRecord", storeRecord);

                        storeRecord = { ...storeRecord, ...editedRecordData };

                        //("000 handlePatch requestData storing...", storeRecord);
                        store.upsert(
                          editedRecordId,
                          JSON.parse("{}"),
                          storeRecord
                        );
                      }
                    );

                    let init = {
                      status: 200,
                      statusText: "Edit will be processed when online",
                    };
                    return resolve(new Response(null, init));
                  }
                });
              },
            },
            fetchStrategy: FetchStrategies.getCacheIfOfflineStrategy({
              backgroundFetch: "disabled",
              serverResponseCallback: function (request, response) {
                //("000 serverResponseCallback request", request);
                //("000 serverResponseCallback response", response);
                return new Promise((resolve, reject) => {
                  resolve(response);
                });
              },
            }),
            cacheStrategy: IldceoCacheStrategies.getHttpCacheHeaderStrategy(),
          });
          let fetchListener = responseProxy.getFetchEventListener();
          registration.addEventListener("fetch", fetchListener);
        });

        // Work orders and inspections stores code end

        const _deleteClientCachedObject = (
          value,
          store,
          idAttribute,
          offlineId
        ) => {
          //('000 _deleteClientCachedObject', value, store, idAttribute, offlineId);

          return new Promise(function (resolve, reject) {
            let id = value[idAttribute || "Id"];
            if (!id && offlineId) {
              id = offlineId;
            }
            //("000 _deleteClientCachedObject id", id);
            PersistenceStoreManager.openStore(store).then((store) => {
              store.removeByKey(id);
              resolve();
            });
          });
        };

        const _getRequestUrlId = (url) => {
          var urlTokens = url.split("/");
          return urlTokens[urlTokens.length - 1];
        };

        const _updateRequestUrlId = (url, updatedItemId) => {
          return url.replace(/\/[^\/]*$/, "/" + updatedItemId);
        };

        const afterRequestListenerForSync = (event) => {
          return new Promise((resolve) => {
            Promise.all([
              PersistenceUtils.requestToJSON(event.request),
              PersistenceUtils.responseToJSON(event.response),
            ]).then(async (values) => {
              try {
                const requestData = values[0];
                const responseData = values[1];

                const dataLogStore = await PersistenceStoreManager.openStore(OBJ_DATA_LOG.STORE);
                const storeKeys = await dataLogStore.keys();

                // let keyToDelete = null;

                // const objForStore = {
                //   url: requestData.url,
                //   requestData: JSON.parse(requestData?.body?.text || '{}'),
                //   responseData: JSON.parse(requestData?.body?.text || '{}')
                // };

                for (const key of storeKeys) {
                  const storeResult = await dataLogStore.findByKey(key);
                  if (!(storeResult?.erroredReq === true)) { await dataLogStore.removeByKey(key); }

                  // if (
                  //   storeResult.url === objForStore.url &&
                  //   JSON.stringify(storeResult.requestData) === JSON.stringify(objForStore.requestData)
                  // ) {
                  //   keyToDelete = key;
                  //   console.log("MATCH");
                  //   break;
                  // }
                }

                // if (keyToDelete) {
                //   await dataLogStore.removeByKey(keyToDelete);
                // }

                // For Ass Line
                if (requestData.url.includes(OBJ_ASSESSMENT_LINES.SCOPE)) {
                  if (requestData.method === "POST") {
                    const body = JSON.parse(responseData.body.text || "{}");
                    //('000 afterSyncRequestListener body', body);

                    let offlineId = 0;

                    // only do this for the assessmentLines
                    if (requestData.url.includes(OBJ_ASSESSMENT_LINES.SCOPE)) {
                      let origReqObj = JSON.parse(requestData.body.text);

                      const code = origReqObj.Code_c;
                      const assessmentId =
                        origReqObj.WxAssessment_Id_WxAssessmentLine;

                      const store = await PersistenceStoreManager.openStore(
                        OBJ_ASSESSMENT_LINES.STORE
                      );
                      const keys = await store.keys();
                      for (let k in keys) {
                        const key = keys[k];
                        const storeResult = await store.findByKey(key);
                        if (
                          code == storeResult.Code_c &&
                          assessmentId ==
                          storeResult.WxAssessment_Id_WxAssessmentLine &&
                          storeResult.NewTempId
                        ) {
                          offlineId = storeResult.Id;
                        }
                      }

                      try {
                        this.attachmentSync(
                          offlineId,
                          JSON.parse(responseData.body.text || "{}").Id
                        );
                      } catch (e) {
                        console.error("000:: attachment sync error", e);
                      }
                      if (offlineId < 0) {
                        //("000 afterSyncRequestListener offlineId storing...");
                        PersistenceStoreManager.openStore(
                          OBJ_SYNC_MAP.STORE
                        ).then((store) => {
                          store.upsert(
                            offlineId,
                            JSON.parse("{}"),
                            JSON.parse(responseData.body.text || "{}").Id
                          );
                        });

                        const store = await PersistenceStoreManager.openStore(
                          OBJ_ASSESSMENT_LINE_MEASURES.STORE
                        );
                        const keys = await store.keys();
                        for (let k in keys) {
                          const key = keys[k];
                          const storeResult = await store.findByKey(key);
                          if (offlineId == storeResult.AssessmentLine_Id_c) {
                            storeResult.AssessmentLine_Id_c = JSON.parse(
                              responseData.body.text || "{}"
                            ).Id;
                          }
                          PersistenceStoreManager.openStore(
                            OBJ_ASSESSMENT_LINE_MEASURES.STORE
                          ).then((store) => {
                            store.upsert(
                              storeResult.Id,
                              JSON.parse("{}"),
                              storeResult
                            );
                          });
                        }
                      }
                    }

                    // delete record with temp id from cache
                    _deleteClientCachedObject(
                      JSON.parse(requestData.body.text),
                      OBJ_ASSESSMENT_LINES.STORE,
                      OBJ_ASSESSMENT_LINES.ID_FIELD,
                      offlineId
                    ).then(() => {
                      resolve({
                        action: "continue",
                      });
                    });
                  }
                }

                // For Batch Scope
                if (requestData.url.includes(OBJ_BATCH.SCOPE)) {
                  if (requestData.method === "POST") {
                    const body = JSON.parse(responseData.body.text || "{}");
                    //('000 afterSyncRequestListenerBatch body', body);

                    // delete record with temp id from cache
                    if (body.hasOwnProperty("parts") && body.parts.length) {
                      for (const part of body.parts) {
                        //("000 afterSyncRequestListenerBatch part", part);
                        if (part.operation == "create") {
                          let offlineId = 0;
                          // only do this for the AssessmentLineMeasures
                          if (
                            part.path.includes(OBJ_ASSESSMENT_LINE_MEASURES.SCOPE)
                          ) {
                            if (
                              part.hasOwnProperty("payload") &&
                              part.payload.hasOwnProperty("Assessment_Id_c") &&
                              part.payload.hasOwnProperty(
                                "AssessmentLine_Id_c"
                              ) &&
                              part.payload.hasOwnProperty("Measure_Id_c")
                            ) {
                              const assessmentId = part.payload.Assessment_Id_c;
                              const assessmentLineId =
                                part.payload.AssessmentLine_Id_c;
                              const measureId = part.payload.Measure_Id_c;
                              const assessmentLineMeasureId = part.payload.Id;
                              //("000 afterSyncRequestListenerBatch responseData storing...", part.payload);
                              PersistenceStoreManager.openStore(
                                OBJ_ASSESSMENT_LINE_MEASURES.STORE
                              ).then((store) => {
                                store.upsert(
                                  assessmentLineMeasureId,
                                  JSON.parse("{}"),
                                  part.payload
                                );
                              });
                              const store =
                                await PersistenceStoreManager.openStore(
                                  OBJ_ASSESSMENT_LINE_MEASURES.STORE
                                );
                              const keys = await store.keys();
                              for (let k in keys) {
                                const key = keys[k];
                                const storeResult = await store.findByKey(key);
                                if (
                                  assessmentId == storeResult.Assessment_Id_c &&
                                  assessmentLineId ==
                                  storeResult.AssessmentLine_Id_c &&
                                  measureId == storeResult.Measure_Id_c &&
                                  storeResult.NewTempId
                                ) {
                                  offlineId = storeResult.Id;
                                  _deleteClientCachedObject(
                                    JSON.parse(requestData.body.text),
                                    OBJ_ASSESSMENT_LINE_MEASURES.STORE,
                                    OBJ_ASSESSMENT_LINE_MEASURES.ID_FIELD,
                                    offlineId
                                  );
                                }
                              }
                            }
                          }
                        } else if (part.operation == "delete") {
                          let recordId = _getRequestUrlId(part.path);
                          if (recordId) {
                            const assLineMeasureStore =
                              await PersistenceStoreManager.openStore(
                                OBJ_ASSESSMENT_LINE_MEASURES.STORE
                              );
                            await assLineMeasureStore.removeByKey(recordId);
                          }
                        }
                      }
                    }
                  }
                }

                // For Work Order
                if (requestData.url.includes(OBJ_WOCHANGE_REQUEST.SCOPE)) {
                  if (requestData.method === "POST") {
                    const body = JSON.parse(responseData.body.text || "{}");
                    //('000 afterSyncRequestListener_WoChangeRequest body', body);

                    let offlineId = 0;

                    if (requestData.url.includes(OBJ_WOCHANGE_REQUEST.SCOPE)) {
                      //("000 afterSyncRequestListener_WoChangeRequest OK - processing...");

                      let origReqObj = JSON.parse(requestData.body.text);
                      //("000 afterSyncRequestListener_WoChangeRequest origReqObj", origReqObj);

                      const recordName = origReqObj.RecordName;
                      const workOrderId = origReqObj.WorkOrder_Id_c;
                      const inspectionId = origReqObj.Inspection_Id_c;
                      const woRequest = origReqObj.Request_c;
                      //('000 afterSyncRequestListener_WoChangeRequest recordName', recordName);
                      //('000 afterSyncRequestListener_WoChangeRequest workOrderId', workOrderId);

                      const store = await PersistenceStoreManager.openStore(
                        OBJ_WOCHANGE_REQUEST.STORE
                      );
                      const keys = await store.keys();
                      for (let k in keys) {
                        const key = keys[k];
                        const storeResult = await store.findByKey(key);
                        if (
                          (inspectionId == storeResult.Inspection_Id_c ||
                            workOrderId == storeResult.WorkOrder_Id_c) &&
                          storeResult.NewTempId
                        ) {
                          offlineId = storeResult.Id;
                        }
                      }
                      //("000:: afterSyncRequestListener_WoChangeRequest assessmentLine offlineId", offlineId);
                      //("000:: afterSyncRequestListener_WoChangeRequest assessmentLine OEC Id", JSON.parse(responseData.body.text || '{}').Id);
                      try {
                        this.attachmentSync(
                          offlineId,
                          JSON.parse(responseData.body.text || "{}").Id
                        );
                      } catch (e) {
                        console.error("000:: attachment sync error", e);
                      }
                      if (offlineId < 0) {
                        //("000 afterSyncRequestListener_WoChangeRequest offlineId storing...");
                        PersistenceStoreManager.openStore(
                          OBJ_SYNC_MAP.STORE
                        ).then((store) => {
                          store.upsert(
                            offlineId,
                            JSON.parse("{}"),
                            JSON.parse(responseData.body.text || "{}").Id
                          );
                        });
                      }
                    }

                    // delete record with temp id from cache
                    _deleteClientCachedObject(
                      JSON.parse(requestData.body.text),
                      OBJ_WOCHANGE_REQUEST.STORE,
                      OBJ_WOCHANGE_REQUEST.ID_FIELD,
                      offlineId
                    ).then(() => {
                      resolve({
                        action: "continue",
                      });
                    });
                  }
                }
                resolve({
                  action: "continue",
                });
              } catch (err) { console.log("Offline Error After->", err) }
            });
          });
        };

        const beforeRequestListenerForSync = (event) => {
          return new Promise((resolve) => {
            PersistenceUtils.requestToJSON(event.request).then(
              async (requestData) => {
                console.log("-->",requestData);
                try {
                  PersistenceStoreManager.openStore(
                    'syncLog'
                  ).then((store) => {
                    store.keys().then((arrVal) => {
                      if (document.getElementById("pendingRequest")) {
                        document.getElementById("pendingRequest").innerText = Number(document.getElementById("totalRequest").innerText) - arrVal.length + 1;
                      }
                    })
                  })
                  const dataLogStore = await PersistenceStoreManager.openStore(
                    OBJ_DATA_LOG.STORE,
                  );

                  // Incase if previous API call failed we compare it with the item in store and skip
                  const dataLogKeys = await dataLogStore.keys();
                  for (let indexOfkey in dataLogKeys) {
                    let tempID = self.generateUUID();
                    const actualKey = dataLogKeys[indexOfkey];
                    const dataLogStoreData = await dataLogStore.findByKey(actualKey);
                    const reqData = JSON.parse(requestData?.body?.text || '{}')
                    if (dataLogStoreData.url == requestData.url && Lodash.isEqual(dataLogStoreData.requestData, reqData)) {
                      dataLogStoreData.erroredReq = true;
                      await dataLogStore.removeByKey(actualKey);
                      while (dataLogKeys.includes(tempID)) {
                        tempID = self.generateUUID();
                      }
                      await dataLogStore.upsert(tempID, {}, dataLogStoreData);
                      console.log("Skip Datalog");
                      resolve({ action: "skip" });
                    }
                  }
                  const tempId = self.generateUUID();
                  const objForStore = { "url": requestData.url, "requestData": JSON.parse(requestData?.body?.text || '{}') }
                  await dataLogStore.upsert(tempId, {}, objForStore);

                  if (
                    requestData.body.text
                  ) {
                    let scopeReg = new RegExp(OBJ_BATCH.SCOPE);
                    // For AssLine
                    if (
                      requestData.url.includes(OBJ_ASSESSMENT_LINES.SCOPE)
                    ) {
                      let origReqObj = JSON.parse(requestData.body.text);
                      //("000 beforeSyncRequestListener origReqObj", origReqObj);

                      if (
                        requestData.method === "POST" ||
                        requestData.method === "PATCH"
                      ) {
                        let newResultId = 0;
                        if (requestData.method === "POST") {
                          const assLinestore =
                            await PersistenceStoreManager.openStore(
                              OBJ_ASSESSMENT_LINES.STORE
                            );
                          const keys = await assLinestore.keys();
                          let isAssLineInStore = false;
                          for (let k in keys) {
                            const key = keys[k];
                            const storeResult = await assLinestore.findByKey(key);
                            if (
                              storeResult.AssessmentArea_c ===
                              origReqObj.AssessmentArea_c &&
                              storeResult.Code_c === origReqObj.Code_c &&
                              storeResult.NewTempId &&
                              storeResult.WxAssessment_Id_WxAssessmentLine ===
                              origReqObj.WxAssessment_Id_WxAssessmentLine
                            ) {
                              isAssLineInStore = true;
                              break;
                            }
                          }
                          if (!isAssLineInStore) {
                            console.log("Skip Only Post");
                            resolve({ action: "skip" });
                          }
                        }
                        if (
                          origReqObj.hasOwnProperty("ParentAssessmentLine_Id_c") &&
                          origReqObj.ParentAssessmentLine_Id_c &&
                          origReqObj.ParentAssessmentLine_Id_c < 0
                        ) {
                          const tempId = origReqObj.ParentAssessmentLine_Id_c;
                          //('000 beforeSyncRequestListener tempId', tempId);

                          const store = await PersistenceStoreManager.openStore(
                            OBJ_SYNC_MAP.STORE
                          );

                          newResultId = await store.findByKey(tempId);

                          //('000 beforeSyncRequestListener newResultId', newResultId);

                          if (newResultId) {
                            //fix the ID...
                            origReqObj.ParentAssessmentLine_Id_c = newResultId;
                          } else {
                            //("000 beforeSyncRequestListener OEC Id not found...");
                            console.log("Skip POST SYNCMAP");
                            resolve({ action: "skip" });
                          }
                        }
                      }

                      if (requestData.method === "PATCH") {
                        const updatedItemId = _getRequestUrlId(requestData.url);
                        //('000 beforeSyncRequestListener updatedItemId', updatedItemId);
                        let newResultId = 0;

                        if (updatedItemId < 0) {
                          const store = await PersistenceStoreManager.openStore(
                            OBJ_SYNC_MAP.STORE
                          );

                          const newResultId = await store.findByKey(updatedItemId);

                          //('000 beforeSyncRequestListener newResultId', newResultId);

                          if (newResultId) {
                            //Error Fix Patch call of Assessment
                            requestData.url = _updateRequestUrlId(
                              requestData.url,
                              newResultId
                            );

                            const store = await PersistenceStoreManager.openStore(
                              OBJ_ASSESSMENT_LINES.STORE
                            );
                            const storeResult = await store.findByKey(newResultId);
                            //('000 beforeSyncRequestListener storeResult', storeResult);
                            if (
                              origReqObj.Code_c == storeResult.Code_c &&
                              origReqObj.WxAssessment_Id_WxAssessmentLine ==
                              storeResult.WxAssessment_Id_WxAssessmentLine &&
                              storeResult.Id > 0
                            ) {
                              // clean up the payload for Fusion
                              delete origReqObj.CreationDate;
                              Object.keys(origReqObj).forEach(function (key) {
                                if (origReqObj[key] === null) {
                                  origReqObj[key] = storeResult[key];
                                }
                              });
                            }

                          } else {
                            //("000 beforeSyncRequestListener OEC Id not found...");
                            console.log("Skip Patch SYnMap");
                            resolve({ action: "skip" });
                          }
                        }
                      }

                      requestData.body.text = JSON.stringify(origReqObj);

                      PersistenceUtils.requestFromJSON(requestData).then(
                        (updatedRequest) => {

                          resolve({ action: "replay", request: updatedRequest });
                        }
                      );
                    } else if (
                      scopeReg.test(requestData.url)
                    ) {
                      let origReqObj = JSON.parse(requestData.body.text);
                      //("000 beforeSyncRequestListenerBatch origReqObj", origReqObj);
                      let arrIndexToDelete = [];
                      if (
                        origReqObj.hasOwnProperty("parts") &&
                        origReqObj.parts.length
                      ) {
                        for (const [i, part] of origReqObj.parts.entries()) {
                          //Delete Measure_c
                          part.payload?.Measure_c
                            ? delete part.payload.Measure_c
                            : "";
                          if (part.operation == "delete") {
                            const updatedItemId = _getRequestUrlId(part.path);
                            //('000 beforeSyncRequestListenerBatch updatedItemId', updatedItemId);
                            let newResultId = 0;
                            if (Number(updatedItemId) < 0) {
                              arrIndexToDelete.push(i);
                              try {
                                let delStore = null;
                                if (
                                  part.path.includes(
                                    OBJ_ASSESSMENT_LINE_MEASURES.SCOPE
                                  )
                                ) {
                                  delStore = await PersistenceStoreManager.openStore(
                                    OBJ_ASSESSMENT_LINE_MEASURES.STORE
                                  );
                                } else {
                                  delStore = await PersistenceStoreManager.openStore(
                                    OBJ_ASSESSMENT_LINES.STORE
                                  );
                                  delStore.removeByKey(updatedItemId);
                                }
                              } catch (err) {
                                console.log(err);
                              }
                            }
                          } else if (part.operation == "create") {
                            // only do this for the AssessmentLineMeasures
                            if (
                              part.path.includes(OBJ_ASSESSMENT_LINE_MEASURES.SCOPE)
                            ) {
                              if (
                                part.hasOwnProperty("payload") &&
                                part.payload.hasOwnProperty("AssessmentLine_Id_c") &&
                                part.payload.AssessmentLine_Id_c &&
                                part.payload.AssessmentLine_Id_c < 0
                              ) {
                                const tempId = part.payload.AssessmentLine_Id_c;
                                //('000 beforeSyncRequestListenerBatch part tempId', tempId);

                                let newResultId = 0;

                                const syncMapStore =
                                  await PersistenceStoreManager.openStore(
                                    OBJ_SYNC_MAP.STORE
                                  );
                                newResultId = await syncMapStore.findByKey(tempId);
                                //('000 beforeSyncRequestListenerBatch part newResultId', newResultId);
                                if (newResultId) {
                                  const assLineMeasureStore =
                                    await PersistenceStoreManager.openStore(
                                      OBJ_ASSESSMENT_LINE_MEASURES.STORE
                                    );
                                  const keys = await assLineMeasureStore.keys();
                                  let isAssLineMeasureInStore = false;
                                  for (let k in keys) {
                                    const key = keys[k];
                                    const storeResult =
                                      await assLineMeasureStore.findByKey(key);
                                    if (
                                      storeResult.Measure_Id_c ===
                                      part.payload.Measure_Id_c &&
                                      (storeResult.AssessmentLine_Id_c ===
                                        part.payload.AssessmentLine_Id_c ||
                                        storeResult.AssessmentLine_Id_c ===
                                        newResultId)
                                    ) {
                                      isAssLineMeasureInStore = true;
                                      break;
                                    }
                                  }
                                  if (isAssLineMeasureInStore) {
                                    part.payload.AssessmentLine_Id_c = newResultId;
                                  } else {
                                    arrIndexToDelete.push(i);
                                  }
                                } else {
                                  //delete part;
                                  //origReqObj.parts.splice(i, 1);
                                  arrIndexToDelete.push(i);
                                }
                              }
                            }
                          }
                        }
                      }
                      // Reversed since splice will reduce the index.
                      arrIndexToDelete.reverse();
                      arrIndexToDelete.forEach((ele) =>
                        origReqObj.parts.splice(ele, 1)
                      );
                      // Error Fix < 1 && get batch calls
                      if (origReqObj.parts < 1) {
                        origReqObj.parts.push({
                          id: "part1",
                          path: "/fndStaticLookups",
                          operation: "get",
                        });
                      }
                      // Remove Attachment if delete

                      //("what goes to Fusion???", origReqObj);
                      requestData.body.text = JSON.stringify(origReqObj);

                      PersistenceUtils.requestFromJSON(requestData).then(
                        (updatedRequest) => {
                          //("what goes to Fusion???", updatedRequest);
                          resolve({ action: "replay", request: updatedRequest });
                        }
                      );
                    } else if (
                      requestData.url.includes(OBJ_WOCHANGE_REQUEST.SCOPE)
                    ) {
                      let origReqObj = JSON.parse(requestData.body.text);
                      //("000 beforeSyncRequestListener_WoChangeRequest origReqObj", origReqObj);

                      if (requestData.method === "PATCH") {
                        const updatedItemId = _getRequestUrlId(requestData.url);
                        //('000 beforeSyncRequestListener_WoChangeRequest updatedItemId', updatedItemId);
                        let newResultId = 0;

                        if (updatedItemId < 0) {
                          const store = await PersistenceStoreManager.openStore(
                            OBJ_SYNC_MAP.STORE
                          );

                          const newResultId = await store.findByKey(updatedItemId);

                          //('000 beforeSyncRequestListener_WoChangeRequest newResultId', newResultId);

                          if (newResultId) {
                            requestData.url = _updateRequestUrlId(
                              requestData.url,
                              newResultId
                            );
                            origReqObj.Id = newResultId;

                            const store = await PersistenceStoreManager.openStore(
                              OBJ_WOCHANGE_REQUEST.STORE
                            );
                            const storeResult = await store.findByKey(newResultId);
                            //('000 beforeSyncRequestListener_WoChangeRequest storeResult', storeResult);

                            // if (origReqObj.RecordName == storeResult.RecordName && origReqObj.WorkOrder_Id_c == storeResult.WorkOrder_Id_c && storeResult.Id > 0) {
                            if (storeResult.Id > 0) {
                              // clean up the payload for Fusion
                              delete origReqObj.CreationDate;
                              Object.keys(origReqObj).forEach(function (key) {
                                if (origReqObj[key] === null) {
                                  origReqObj[key] = storeResult[key];
                                }
                              });
                            }

                            //('000 beforeSyncRequestListener_WoChangeRequest origReqObj', origReqObj);
                          } else {
                            //("000 beforeSyncRequestListener_WoChangeRequest OEC Id not found...");
                            resolve({ action: "skip" });
                          }
                        }
                      }

                      requestData.body.text = JSON.stringify(origReqObj);

                      PersistenceUtils.requestFromJSON(requestData).then(
                        (updatedRequest) => {
                          //("what goes to Fusion???", updatedRequest);
                          resolve({ action: "replay", request: updatedRequest });
                        }
                      );
                    } else { resolve({ action: "continue" }); }

                  } else {
                    resolve({ action: "continue" });
                  }
                } catch (err) { console.log("Offline Error ->", err) }
              }
            );
          });
        };

        // handles request data before synch
        PersistenceManager.getSyncManager().addEventListener(
          "syncRequest",
          afterRequestListenerForSync
        );
        PersistenceManager.getSyncManager().addEventListener(
          "beforeSyncRequest",
          beforeRequestListenerForSync
        );

      });
      //("000 end OK");
    }

    //Only used to generate UUID while offline
    generateUUID() {
      // Initialize snowflake
      //var snowflake = new SnowflakeId({});
      let generatedId =
        performance.timeOrigin + performance.now() * 100000000000; //1000000000000000
      return generatedId * -1;
    }

    getSyncLog() {
      return PersistenceManager.getSyncManager().getSyncLog();
    }

    removeGetsFromSyncLog() {
      return new Promise(async (resolve, reject) => {
        let syncLog = await this.getSyncLog();
        console.log(syncLog);
        for (let i = 0; i < syncLog.length; i++) {
          if (
            syncLog[i].request.method === "GET" ||
            (syncLog[i].request.method === "POST" &&
              syncLog[i].request.url.includes("WxInspection_c"))
          ) {
            let requestId = syncLog[i].requestId;
            let removedRequest =
              await PersistenceManager.getSyncManager().removeRequest(
                requestId
              );
            // //("000 STOPPED SYNC FOR GET: " + removedRequest.url);
          }
        }
        let syncLog1 = await this.getSyncLog();
        console.log(syncLog1);
        resolve();
      });
    }

    syncOfflineChanges() {
      if (!PersistenceManager.isOnline()) {
        alert("YOU ARE OFFLINE!");
        return;
      }

      // this.removeGetsFromSyncLog();

      return new Promise((resolve, reject) => {
        try {
          this.removeGetsFromSyncLog().then(() => {
            PersistenceStoreManager.openStore(
              'syncLog'
            ).then((store) => {
              store.keys().then((arrVal) => {
                let container = document.getElementById("progressContainer");
                if (container) {
                  container.style.display = "block";
                  document.getElementById("totalRequest").innerText = arrVal.length;
                  document.getElementById("pendingRequest").innerText = 1;
                }
              })
            })
            PersistenceManager.getSyncManager()
              .sync({
                preflightOptionsRequest: "disabled",
              })
              .then(() => {
                //("000 SYNC DONE!");
                let container = document.getElementById("progressContainer");
                if (container) { container.style.display = "none"; }
                resolve("complete");
              }).catch(err => {
                resolve("error");
              });
          });
        } catch (err) {
          console.error("000 SYNC ERROR:");
          console.error("============error", err);
          let response = err.response;
          reject(response?.status);
        }
      });
    }

    /**
     * Boolean flag: If true, sets the PersistenceManager offline
     */
    forceOffline(flag) {
      var self = this;
      flag = flag ? true : false;
      PersistenceManager.forceOffline(flag);

      return ServiceWorkerHelpers.forceOffline(flag)
        .then(function () {
          /** if online, Sync requests that were made while offline */
          if (!flag) {
            //("Sync Starting!!!")
            return self.syncOfflineChanges();
          }
          return Promise.resolve();
        })
        .catch(function (error) {
          console.error(error);
          return error;
        });
    }

    /**
     *  Delete the specific store, including all the content stored in the store.
     */
    clearCache(storesToDelete) {
      //("000 STORES TO DELETE: " + storesToDelete);

      if (storesToDelete.length) {
        var promises = storesToDelete.map(function (store) {
          //("000 DELETING STORE: " + store);
          if (store === "attachmentDetails") {
            return attachmentDetailsStore.destroy().then(function () {
              console.log("Store Deleted AD ->");
              attachmentDetailsStore = new PDUtils("attachmentDetails");
              this.attachmentDetails = attachmentDetailsStore;
              console.log("Store Created AD ->");
            }).catch(function (err) {
              // error occurred
            })
          } else if (store === "attachmentFiles") {
            return attachmentFilesStore.destroy().then(function () {
              console.log("Store Deleted AF ->");
              attachmentFilesStore = new PDUtils("attachmentFiles");
              this.attachmentFiles = attachmentFilesStore;
              console.log("Store Created AF ->");
            }).catch(function (err) {
              // error occurred
            })
          } else {
            return PersistenceStoreManager.deleteStore(store);
          }
        });

        return Promise.all(promises)
          .then(function () {
            return "complete";
          })
          .catch(function (err) {
            console.error("failed deleting store " + err);
            return "failed";
          });
      } else {
        return false;
      }
    }

    getLength(number) {
      return number.toString().length;
    }

    isExist(objectName) {
      return new Promise(async (resolve, reject) => {
        let cleanStoreName = [];
        for (let storeName of objectName) {
          const isExisting = (await window.indexedDB.databases()).some((obj) =>
            obj.name.includes(storeName)
          );
          if (!isExisting) cleanStoreName.push(storeName);
        }
        resolve(cleanStoreName);
      });
    }

    //attachment syn methods
    getAttachmentLineInfo(currentLineId) {
      return new Promise(async (resolve, reject) => {
        await this.attachmentDetails.allDocs(
          { include_docs: true },
          function (err, docs) {
            if (!docs) {
              resolve([]);
              return console.error("000:: getAttachmentLineInfo ", err);
            } else {
              let attachmentInfo = [];
              for (let tempObj of docs.rows) {
                const row = tempObj.doc;
                try {
                  let fileId;
                  if (row._id.substring(0, 1) == "-") {
                    fileId = "-" + row._id.split("-")[1]; //offline id
                  } else {
                    fileId = row._id.split("-")[0]; //online id
                  }
                  //('000:: attachfrom getAttachmentLineInfo currentLineId(' + currentLineId + '==' + fileId + ') =>  (' + (currentLineId && (fileId == currentLineId)) + ')');
                  if (currentLineId && fileId == currentLineId) {
                    //('000:: attachmentInfo row If', row);
                    attachmentInfo.push(row);
                  }
                  //('000:: attachmentInfo row Else', row);
                } catch (e) {
                  //('000:: attachmentInfo error', e);
                }
              }
              //('000:: attachmentInfo from getAttachmentLineInfo', attachmentInfo);
              resolve(attachmentInfo);
            }
          }
        );
      });
    }
    getAttachmentInfo(offlineId) {
      //('000:: getAttachmentInfo offlineId', offlineId);
      return new Promise(async (resolve, reject) => {
        await this.attachmentDetails.allDocs(
          { include_docs: true },
          function (err, docs) {
            if (!docs) {
              resolve([]);
              return console.error("000:: get attachment error ", err);
            } else {
              let attachmentInfo = [];
              for (let tempObj of docs.rows) {
                const row = tempObj.doc;
                try {
                  //('000:: if offlineId' + (offlineId + "==" + row._id));
                  if (offlineId && row._id == offlineId) {
                    attachmentInfo.push(row);
                  }
                } catch (e) {
                  console.error("catch error", e);
                }
              }
              //('000:: get Attachment Info', attachmentInfo);
              resolve(attachmentInfo);
            }
          }
        );
      });
    }
    getAttachmentFileDoc(offlineId) {
      //get attachment by offline id
      //('000:: getAttachmentFileDoc offlineId', offlineId);
      return new Promise(async (resolve, reject) => {
        this.attachmentFiles.get(
          offlineId,
          { attachments: true },
          function (err, doc) {
            if (err) {
              return console.error("000:: get Attachment failed" + err);
            } else {
              //('000:: get Attachment File', doc);
              resolve(doc);
            }
          }
        ); //attachmentFiles end
      }); //promise end
    }

    deleteAttachmentFile(offlineId, fileName) {
      return new Promise(async (resolve, reject) => {
        var attFiles = this.attachmentFiles;
        var attInfo = this.attachmentDetails;
        attFiles.get(offlineId).then(function (doc) {
          return attFiles.remove(doc);
        }).catch(err => {
          console.log(err);
        });
        attInfo.get(offlineId).then(function (doc) {
          return attInfo.remove(doc);
        }).catch(err => {
          console.log(err);
        });
        resolve("Successfully Deleted");
      });
    }

    createNewFileFromDocResponse(
      fileDocs,
      infoDocs,
      oecId,
      fileName,
      offlineId
    ) {
      //('000:: createNewFileFromDocResponse...');
      return new Promise(async (resolve, reject) => {
        const b64toBlob = (b64Data, contentType = "", sliceSize = 512) => {
          const byteCharacters = atob(b64Data);
          const byteArrays = [];

          for (
            let offset = 0;
            offset < byteCharacters.length;
            offset += sliceSize
          ) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);

            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }

          const blob = new Blob(byteArrays, { type: contentType });
          return blob;
        };
        //insert attachment with OEC id
        delete fileDocs._rev;
        fileDocs._id = oecId;
        //('000:: Inserting attachment with OEC id...', oecId);
        //('000:: fileDocs', fileDocs);
        const blob = b64toBlob(
          fileDocs._attachments[fileName].data,
          fileDocs._attachments[fileName].content_type
        );
        await this.attachmentFiles
          .putAttachment(
            oecId,
            fileName,
            blob,
            fileDocs._attachments[fileName].content_type,
            function (err, res) {
              if (err) {
                //(err);
              } else {
                //("000::Attachment file added successfully");
              }
            }
          )
          .catch(function (err) {
            if (err.name == "conflict") {
              // conflict!
              console.error("conflict issue", err);
            } else {
              // some other error
              //(err);
            }
          });
        delete infoDocs[0]._rev;
        infoDocs[0]._id = oecId;
        infoDocs[0].objectId = oecId.split("-")[0];
        infoDocs[0].fileURL = infoDocs[0].fileURL.replaceAll(
          "-" + offlineId.split("-")[1],
          oecId.split("-")[0]
        );
        //('000:: infoDocs', infoDocs);
        //insert attachment info with OEC id
        await this.attachmentDetails
          .bulkDocs(infoDocs, function (err, response) {
            if (err) {
              console.error("000:: add attachment failed", err);
            } else {
              //("000::Documents created Successfully", response);
            }
          })
          .catch(function (err) {
            if (err.name == "conflict") {
              // conflict!
              console.error("Create file or detail conflict error", err);
            } else {
              // some other error
              console.error("conflit error", err);
            }
          });
        resolve("Successfully created");
      });
    }

    updatePouchDbAttachment(fileId) {
      this.attachmentDetails
        .bulkDocs(infoDocs, function (err, response) {
          if (err) {
            console.error("000:: add attachment failed", err);
          } else {
            //("000::Documents created Successfully", response);
          }
        })
        .catch(function (err) {
          if (err.name == "conflict") {
            // conflict!
            console.error("Create file or detail conflict error", err);
          } else {
            // some other error
            console.error("conflit error", err);
          }
        });
    }
    attachmentSync(offlineId, oecId) {
      return new Promise(async (resolve, reject) => {
        const lineDocs = await this.getAttachmentLineInfo(offlineId);
        //("000:: attachmentSync lineDocs", lineDocs);
        //("000:: =============================> (1)");
        for (let lineDoc of lineDocs) {
          try {
            const offlineIdUpdated = offlineId + "-" + lineDoc.fileName;
            const oecIdUpdated = oecId + "-" + lineDoc.fileName;
            //("000:: =============================> (2)");
            let infoDocs = await this.getAttachmentInfo(offlineIdUpdated);
            //("000:: =============================> (3)");
            let fileDocs = await this.getAttachmentFileDoc(offlineIdUpdated);
            //("000:: =============================> (4)");
            let createResp = await this.createNewFileFromDocResponse(
              fileDocs,
              infoDocs,
              oecIdUpdated,
              lineDoc.fileName,
              offlineIdUpdated
            );
            //("000:: =============================> (5)");
            let deleteResp = await this.deleteAttachmentFile(
              offlineIdUpdated,
              lineDoc.fileName
            );
            //("000:: =============================> (6)");
          } catch (e) {
            console.error("000:: attachment sync error", e);
          }
          continue;
        }
        resolve("Done");
      });
    }
    ///file attachment syn code end
    /**
     * fix for LIKE queries to work
     */
    _createQueryFromAdfBcParams(value) {
      var findQuery = {};

      if (value) {
        var parser = new SqlWhereParser();
        var queryExpArray = value.split(";");
        var i;
        var selectorQuery = {};
        var selectorQueryItemArray = [];
        var selectorQueryItem = {};

        for (i = 0; i < queryExpArray.length; i++) {
          selectorQueryItem = parser.parse(
            queryExpArray[i],
            function (operatorValue, operands) {
              operatorValue = operatorValue.toUpperCase();
              // the LHS operand is always a value operand
              if (operatorValue != "AND" && operatorValue != "OR") {
                operands[0] = "value." + operands[0];
              }
              var lhsOp = operands[0];
              var rhsOp = operands[1];
              var returnExp = {};
              switch (operatorValue) {
                case ">":
                  returnExp[lhsOp] = {
                    $gt: rhsOp,
                  };
                  break;
                case "<":
                  returnExp[lhsOp] = {
                    $lt: rhsOp,
                  };
                  break;
                case ">=":
                  returnExp[lhsOp] = {
                    $gte: rhsOp,
                  };
                  break;
                case "<=":
                  returnExp[lhsOp] = {
                    $lte: rhsOp,
                  };
                  break;
                case "=":
                  returnExp[lhsOp] = {
                    $eq: rhsOp,
                  };
                  break;
                case "!=":
                  returnExp[lhsOp] = {
                    $ne: rhsOp,
                  };
                  break;
                case "AND":
                  returnExp = {
                    $and: operands,
                  };
                  break;
                case "OR":
                  returnExp = {
                    $or: operands,
                  };
                  break;
                case "LIKE":
                  rhsOp = rhsOp.replace(/%/g, ".*");
                  returnExp[lhsOp] = {
                    $regex: RegExp(rhsOp, "i"),
                  };
                  break;
                case "BETWEEN":
                  var betweenOperands = [];
                  betweenOperands[0] = {};
                  betweenOperands[1] = {};
                  betweenOperands[0][lhsOp] = {
                    $gte: operands[1],
                  };
                  betweenOperands[1][lhsOp] = {
                    $lte: operands[2],
                  };
                  returnExp = {
                    $and: betweenOperands,
                  };
                  break;
              }
              return returnExp;
            }
          );
          selectorQueryItemArray.push(selectorQueryItem);
        }
        if (selectorQueryItemArray.length > 1) {
          selectorQuery["$and"] = selectorQueryItemArray;
        } else if (selectorQueryItemArray.length == 1) {
          selectorQuery = selectorQueryItemArray[0];
        }
        if (Object.keys(selectorQuery).length > 0) {
          findQuery.selector = selectorQuery;
        }
      }
      return findQuery;
    }

    async getDataFromStore() {
      const dataLogStore = await PersistenceStoreManager.openStore(OBJ_DATA_LOG.STORE);
      const storeKeys = await dataLogStore.keys();
      let storeData = [];
      for (const key of storeKeys) {
        const storeResult = await dataLogStore.findByKey(key);
        storeData.push(storeResult);
      }
      return storeData;
    }
  }
  return OfflineController;
});
