(function () {
    'use strict';

    angular
        .module('app')
        .controller('DesignerCtrl', DesignerController);

    DesignerController.$inject = ['$rootScope', '$scope', '$routeParams', '$interval', '$timeout', '$location', 'ItemsService', 'FlowService', 'RuleEngineService', 'FlowCompiler', 'ModulesTypesExtensions', 'prompt', '$filter', '$uibModal', 'Modelfactory', 'flowchartConstants', 'module_types', 'flowinfo', 'FileSaver', 'LocalFileReader'];
    function DesignerController($rootScope, $scope, $routeParams, $interval, $timeout, $location, ItemsService, FlowService, RuleEngineService, FlowCompiler, ModulesTypesExtensions, prompt, $filter, $modal, Modelfactory, flowchartConstants, module_types, flowinfo, FileSaver, LocalFileReader) {
        var vm = this;

        vm.module_types = module_types;

        var deleteKeyCode = 46;
        var ctrlKeyCode = 17;
        var aKeyCode = 65;
        var sKeyCode = 83;
        var escKeyCode = 27;
        var ctrlDown = false;

        function getModuleTypeCategory(moduleType) {
            if ($filter('filter')(module_types.triggers, { uid: moduleType.uid }).length) return "trigger";
            if ($filter('filter')(module_types.conditions, { uid: moduleType.uid }).length) return "condition";
            if ($filter('filter')(module_types.actions, { uid: moduleType.uid }).length) return "action";
            throw "Unknown module type";
        }

        function reloadModel() {
            vm.showFlow = false;

            var modelservice = Modelfactory(vm.model, vm.flowchartselected);
            vm.modelservice = modelservice;

            vm.callbacks = {
                edgeDoubleClick: function () {
                    console.log('Edge double clicked.');
                },
                edgeMouseOver: function () {
                    console.log('mouseover')
                },
                isValidEdge: function (source, destination) {
                    return source.type === flowchartConstants.bottomConnectorType && destination.type === flowchartConstants.topConnectorType;
                },
                edgeAdded: function (edge) {
                    console.log("edge added");
                    console.log(edge);
                },
                nodeRemoved: function (node) {
                    console.log("node removed");
                    console.log(node);
                },
                edgeRemoved: function (edge) {
                    console.log("edge removed");
                    console.log(edge);
                },
                nodeCallbacks: {
                    'doubleClick': function (event) {
                        console.log('Node was doubleclicked.')
                    },
                    'getDefaultNodeLabel': function (node) {
                        return ModulesTypesExtensions.getDefaultLabel(node.module_type_uid, node.type, node.module_config);
                    }
                },
            };
            modelservice.registerCallbacks(vm.callbacks.edgeAdded, vm.callbacks.nodeRemoved, vm.callbacks.edgeRemoved);

            $timeout(function () {
                $rootScope.currentFlowId = vm.currentFlowId;
                vm.showFlow = true;
            })
        }


        $rootScope.keyDown = function (evt) {
            if (evt.keyCode === ctrlKeyCode) {
                ctrlDown = true;
                evt.stopPropagation();
                evt.preventDefault();
            }

            if (evt.keyCode == sKeyCode && (evt.ctrlKey || evt.metaKey)) {
                vm.saveFlow();
                evt.stopPropagation();
                evt.preventDefault();
            }
            
        };

        $rootScope.keyUp = function (evt) {

            if (evt.keyCode === deleteKeyCode) {
                vm.modelservice.deleteSelected();
            }

            // if (evt.keyCode == aKeyCode && ctrlDown) {
            //     vm.modelservice.selectAll();
            //     evt.stopPropagation();
            //     evt.preventDefault();
            // }

            if (evt.keyCode == escKeyCode) {
                vm.modelservice.deselectAll();
            }

            if (evt.keyCode === ctrlKeyCode) {
                ctrlDown = false;
                evt.stopPropagation();
                evt.preventDefault();
            }
        };       

        activate();

        ////////////////


        function activate() {
            ItemsService.reloadItems();


            vm.flowchartselected = [];

            vm.model = flowinfo.currentFlow;
            vm.currentFlowId = flowinfo.currentFlowId;
            vm.flowIds = flowinfo.flowIds;
            
            reloadModel();
        }

        vm.addNode = function (module, x, y) {
            if (!module) return;

            var moduleName = module.replace('module-', '');
            var moduleType = $filter('filter')(module_types.all, { uid: moduleName })[0];
            var category = getModuleTypeCategory(moduleType);

            var newNode = {
                module_type_uid: moduleType.uid,
                name : '',
                id: vm.model.next_node_id++,
                x: x,
                y: y,
                type: category,
                connectors: [],
                module_config: {}
            };

            switch (category) {
                case 'trigger':
                    newNode.connectors.push({ id: vm.model.next_connector_id++, type: flowchartConstants.bottomConnectorType });
                    break;
                case 'condition':
                    newNode.connectors.push({ id: vm.model.next_connector_id++, type: flowchartConstants.topConnectorType });
                    newNode.connectors.push({ id: vm.model.next_connector_id++, type: flowchartConstants.bottomConnectorType, path: 'true' });
                    newNode.connectors.push({ id: vm.model.next_connector_id++, type: flowchartConstants.bottomConnectorType, path: 'false' });
                    break;
                case 'action':
                    newNode.connectors.push({ id: vm.model.next_connector_id++, type: flowchartConstants.topConnectorType });
                    newNode.connectors.push({ id: vm.model.next_connector_id++, type: flowchartConstants.bottomConnectorType });
                    break;
            }

            vm.model.nodes.push(newNode);
        };

        vm.getNodeModuleType = function (node) {
            var moduleTypeUid = node.module_type_uid;
            return $filter('filter')(module_types.all, {uid: moduleTypeUid})[0];
        };

        vm.saveFlow = function () {
            if (vm.currentFlowId === 'untitled') {
                vm.saveFlowAs();
            } else {
                vm.saving = true;
                FlowService.saveFlowAs(vm.currentFlowId, vm.model).then (function () {
                    vm.saving = false;
                    console.log('Save complete');
                    vm.justSaved = true;
                    $interval(function () { vm.justSaved = false; }, 2000);
                });
            }
        };

        vm.saveFlowAs = function () {
            prompt({
                title: 'Save flow on server',
                message: 'Please specify the ID of your flow: use alphanumerical characters and underscores only!',
                input: 'true',
                label: 'Name',
            }).then (function (newId) {
                var isValidId = new RegExp(/^\w+$/).test(newId);
                if (!isValidId || newId === 'untitled') {
                    prompt({ title: 'Invalid identifier', message: 'Use alphanumerical characters and underscores only! Example: my_new_flow' });
                } else {
                    vm.saving = true;
                    FlowService.saveFlowAs(newId, vm.model).then (function () {
                        vm.saving = false;
                        vm.currentFlowId = newId;
                        vm.flowIds = FlowService.getFlowIds();
                        console.log('SaveAs complete');
                        vm.justSaved = true;
                        $interval(function () { vm.justSaved = false; }, 2000);
                    });
                }
            })

        };

        vm.switchFlow = function (newId) {
            FlowService.setCurrentFlowId(newId);
            vm.model = vm.currentFlow = FlowService.getCurrentFlow();
            vm.currentFlowId = newId;
            reloadModel();
        };

        vm.newFlow = function () {
            vm.model = vm.currentFlow = FlowService.getNewFlow();
            vm.currentFlowId = 'untitled';
            reloadModel();
        };

        vm.deleteFlow = function () {
            if (vm.currentFlowId === 'untitled') return;

            prompt({
                title: 'Delete flow',
                message: 'Are you sure you wish to delete this flow: ' + vm.currentFlowId + '?. This cannot be undone!'
            }).then (function (newId) {
                FlowService.deleteCurrentFlow();
                vm.model = vm.currentFlow = FlowService.getCurrentFlow();
                vm.currentFlowId = FlowService.getCurrentFlowId();
                vm.flowIds = FlowService.getFlowIds();

                reloadModel();
            });
        };

        vm.buildFlow = function () {
            vm.modelservice.deselectAll();
            vm.activeNodeConfigTab = 1;
            vm.lastBuildLogs = [];
            vm.lastBuildResult = [];
            vm.lastBuildError = '';
            vm.publishRequests = [];
            vm.publishResultClass = '';

            var result = FlowCompiler.buildFlow(vm.model, vm.currentFlowId);
            vm.lastBuildLogs = result.logs;
            if (!result.error) vm.lastBuildResult = result.rules;
            vm.lastBuildError = result.error;
        };

        vm.publishFlow = function () {
            vm.modelservice.deselectAll();
            vm.lastBuildLogs = [];
            vm.lastBuildResult = [];
            vm.lastBuildError = '';
            vm.activeNodeConfigTab = 1;
            vm.publishRequests = [];
            vm.publishResultClass = '';

            var result = FlowCompiler.buildFlow(vm.model, vm.currentFlowId);
            vm.lastBuildError = result.error;
            vm.lastBuildLogs = result.logs;
            if (!result.error) {
                vm.lastBuildResult = result.rules;
                vm.publishResultClass = 'warning';
                RuleEngineService.publishFlow(result.rules, vm.currentFlowId).then(function () {
                    vm.publishResultClass = 'success';
                }, function (err) {
                    alert('An error occured while publishing: ' + err);
                    vm.publishResultClass = 'danger';
                }, function (progress) {
                    //console.log(progress);
                    vm.publishResultClass = 'warning';
                    vm.publishRequests = vm.publishRequests.concat(progress);
                });
            }
        }

        vm.runFlow = function () {
            // not implemented
        }

        vm.unpublishFlow = function () {
            vm.modelservice.deselectAll();
            vm.lastBuildLogs = [];
            vm.lastBuildResult = [];
            vm.lastBuildError = '';
            vm.activeNodeConfigTab = 1;
            vm.publishResultClass = 'warning';
            vm.publishRequests = [];

            RuleEngineService.unpublishFlow(vm.currentFlowId).then(function (resp) {
                vm.publishRequests = resp;
                vm.publishResultClass = 'success';
            }, function (err) {
                alert('An error occurred while unpublishing: ' + err);
                vm.publishResultClass = 'danger';
            });
        }

        vm.exportToFile = function () {
            var data = new Blob([JSON.stringify(vm.model, null, 4)], { type: 'application/json;charset=utf-8'});
            FileSaver.saveAs(data, vm.currentFlowId + '.flow.json');
        }
    }

})();    
