(function() {
    'use strict';

    angular
        .module('app.services')
        .service('RuleEngineService', RuleEngineService);

    RuleEngineService.$inject = ['$http', '$q', '$filter'];
    function RuleEngineService($http, $q, $filter) {
        this.getModuleTypes = getModuleTypes;
        this.getRules = getRules;
        this.getRulesWithPrefix = getRulesWithPrefix;
        this.unpublishFlow = unpublishFlow;
        this.publishFlow = publishFlow;
        
        ////////////////

        var moduleTypes = null;

        function getModuleTypes() {
            var deferred = $q.defer();
            if (moduleTypes) {
                deferred.resolve(moduleTypes);
            } else {
                var all = $http.get('/rest/module-types');
                var triggers = $http.get('/rest/module-types?type=trigger');
                var conditions = $http.get('/rest/module-types?type=condition');
                var actions = $http.get('/rest/module-types?type=action');

                $q.all([all, triggers, conditions, actions]).then(function (resp) {
                    if (resp) {
                        moduleTypes = {
                            all: resp[0].data,
                            triggers: resp[1].data,
                            conditions: resp[2].data,
                            actions: resp[3].data
                        };
                        deferred.resolve(moduleTypes);
                    }
                }, function (err) {
                    deferred.reject(err);
                });
            }

            return deferred.promise;
        }

        function getRules() {
            return $http.get('/rest/rules');
        }

        function getRulesWithPrefix(prefix, tags) {
            return $http.get('/rest/rules', { params: { prefix: prefix, tags: tags }});
        }

        function unpublishFlow(prefix) {
            return getRulesWithPrefix(prefix, prefix).then(function (resp) {
                if (resp.data) {
                    // var matchingRules = $filter('filter')(resp.data, function (r) {
                    //     return r.uid.indexOf(prefix) === 0;
                    // });
                    var deleteRequests = resp.data.map(function (rule) {
                        return $http.delete('/rest/rules/' + rule.uid);
                    });

                    return $q.all(deleteRequests);
                }
            })
        }

        function addRules(rules) {
            var putRequests = rules.map(function (rule) {
                return $http({
                    method: 'POST',
                    url: '/rest/rules',
                    data: rule,
                    headers: { 'Content-Type': 'application/json' }
                });
            });

            return $q.all(putRequests);
        }

        function publishFlow(rules, flowid) {
            var deferred = $q.defer();

            unpublishFlow(flowid).then(function (deleteresp) {
                deferred.notify(deleteresp);
                addRules(rules).then(function (putresp) {
                    deferred.notify(putresp);
                    deferred.resolve(rules);
                });
            });

            return deferred.promise;
        }

    }
})();