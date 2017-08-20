(function() {
    'use strict';

    angular.module('app', [
        'ui.bootstrap',
        'ui.select',
        'ngRoute',
        'ngSanitize',
        'app.services',
        'app.shared',
        'cgPrompt',
        'LocalStorageModule',
        'oc.lazyLoad',
        'angular-clipboard',
        'ngFileSaver',
        'flowchart'
    ])
    .config(['$routeProvider', 'localStorageServiceProvider', 'NodeTemplatePathProvider', function($routeProvider, localStorageServiceProvider, NodeTemplatePathProvider) {
        localStorageServiceProvider.setStorageType('localStorage');

        NodeTemplatePathProvider.setTemplatePath("app/designer/node.html");

        $routeProvider
            .when('/', {
                templateUrl: 'app/designer/designer.html',
                controller: 'DesignerCtrl',
                controllerAs: 'vm',
                resolve: {
                    module_types: ['RuleEngineService', function (RuleEngineService) {
                        return RuleEngineService.getModuleTypes();
                    }],
                    flowinfo: ['StorageService', 'FlowService', function (StorageService, FlowService) {
                        return StorageService.getServiceConfiguration().then(function () {
                            return {
                                currentFlowId:  FlowService.getCurrentFlowId(),
                                currentFlow:  FlowService.getCurrentFlow(),
                                flowIds: FlowService.getFlowIds()
                            }
                        })
                    }],
                }
            })
            .when('/error', {
                templateUrl: 'app/error/error.html'
            })
           .otherwise({
                redirectTo: '/'
            });

    }])
    .run(['$rootScope', '$location', function($rootScope, $location) {

            $rootScope.$on('$routeChangeError', function (evt, current, previous, rejection) {
                $location.path('/error');
            });
    }])
})();