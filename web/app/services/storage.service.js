(function() {
    'use strict';

    angular
        .module('app.services')
        .value('OH2ServiceConfiguration', {})
        .service('StorageService', StorageService);

    StorageService.$inject = ['$http', '$q', 'OH2ServiceConfiguration'];
    function StorageService($http, $q, OH2ServiceConfiguration) {
        var SERVICE_NAME = 'org.openhab.flowsbuilder';

        this.getServiceConfiguration = getServiceConfiguration;
        this.saveServiceConfiguration = saveServiceConfiguration;

        ////////////////

        function getServiceConfiguration() {
            var deferred = $q.defer();

            if (OH2ServiceConfiguration.currentFlow) {
                deferred.resolve(OH2ServiceConfiguration);
            } else {
                $http.get('/rest/services/' + SERVICE_NAME + '/config').then(function (resp) {
                    console.log('openHAB 2 service configuration loaded');
                    if (resp.data.flowsRegistry)
                        OH2ServiceConfiguration.flowsRegistry = JSON.parse(resp.data.flowsRegistry);
                    if (resp.data.currentFlow)
                        OH2ServiceConfiguration.currentFlow = resp.data.currentFlow;
                    deferred.resolve(OH2ServiceConfiguration);
                }, function (err) {
                    deferred.reject(err);
                });
            }

            return deferred.promise;
        }

        function saveServiceConfiguration() {
            var deferred = $q.defer();
            var postData = {};
            if (OH2ServiceConfiguration.flowsRegistry)
                postData.flowsRegistry = JSON.stringify(OH2ServiceConfiguration.flowsRegistry, null, 4);
            if (OH2ServiceConfiguration.currentFlow)
                postData.currentFlow = OH2ServiceConfiguration.currentFlow;
            else
                postData.currentFlow = null;

            $http({
                method: 'PUT',
                url: '/rest/services/' + SERVICE_NAME + '/config',
                data: postData,
                headers: { 'Content-Type': 'application/json' }
            }).then (function (resp) {
                console.log('openHAB 2 service configuration saved');
                deferred.resolve();
            }, function (err) {
                console.error('Error while saving openHAB 2 service configuration: ' + JSON.stringify(err));
                deferred.reject(err);
            });

            return deferred.promise;
        }
    }
})();