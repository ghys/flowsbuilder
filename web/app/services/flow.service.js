(function () {
    'use strict';

    angular
        .module('app.services')
        .service('FlowService', FlowService);

    FlowService.$inject = ['StorageService', 'OH2ServiceConfiguration', '$q'];
    function FlowService(StorageService, OH2ServiceConfiguration, $q) {
        this.getNewFlow = getNewFlow;
        this.getCurrentFlow = getCurrentFlow;
        this.getCurrentFlowId = getCurrentFlowId;
        this.setCurrentFlowId = setCurrentFlowId;
        this.getFlowIds = getFlowIds;
        this.saveFlowAs = saveFlowAs;
        this.deleteCurrentFlow = deleteCurrentFlow;

        ////////////////

        function getNewFlow() {
            return {
                next_node_id: 1,
                next_connector_id: 1,
                nodes: [],
                edges: [],
            };
        }

        function getCurrentFlow() {
            // we assume the loading of the OH2ServiceConfiguration has been done before (router's resolve...)
            return (OH2ServiceConfiguration.flowsRegistry && OH2ServiceConfiguration.flowsRegistry[OH2ServiceConfiguration.currentFlow])
                ? angular.copy(OH2ServiceConfiguration.flowsRegistry[OH2ServiceConfiguration.currentFlow])
                : getNewFlow();
        }

        function getCurrentFlowId() {
            // we assume the loading of the OH2ServiceConfiguration has been done before (router's resolve...)
            return OH2ServiceConfiguration.currentFlow || 'untitled';
        }

        function setCurrentFlowId(id) {
            OH2ServiceConfiguration.currentFlow = id;
        }

        function getFlowIds() {
            return (OH2ServiceConfiguration.flowsRegistry) ? Object.keys(OH2ServiceConfiguration.flowsRegistry) : ['untitled'];
        }

        function saveFlowAs(id, flow) {
            var deferred = $q.defer();

            // TODO: poor man's optimistic concurrency
            flow.updatedTime = new Date().toISOString();
            if (!OH2ServiceConfiguration.flowsRegistry) {
                console.info('Initializing registry');
                OH2ServiceConfiguration.flowsRegistry = {};
            }

            OH2ServiceConfiguration.flowsRegistry[id] = flow;
            OH2ServiceConfiguration.currentFlow = id;
            StorageService.saveServiceConfiguration().then(function () {
                deferred.resolve();
            });

            return deferred.promise;
        }

        function deleteCurrentFlow() {
            if (!OH2ServiceConfiguration.flowsRegistry) return;
            var deferred = $q.defer();

            delete OH2ServiceConfiguration.flowsRegistry[OH2ServiceConfiguration.currentFlow];
            if (getFlowIds().length > 0) {
                OH2ServiceConfiguration.currentFlow = getFlowIds()[0];
            } else {
                delete OH2ServiceConfiguration.currentFlow;
            }

            StorageService.saveServiceConfiguration().then(function () {
                deferred.resolve();
            });
        }
    }
})();