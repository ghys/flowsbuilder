(function () {
    'use strict';

    angular
        .module('app')
        .controller('DesignerCtrl', DesignerController);

    DesignerController.$inject = ['$rootScope', '$scope', '$q', '$routeParams', '$interval', '$timeout', '$location', 'ItemsService', 'EventSourceService', 'FlowService', 'RuleEngineService', 'FlowCompiler', 'ModulesTypesExtensions', 'prompt', '$filter', '$uibModal', 'Modelfactory', 'flowchartConstants', 'module_types', 'flowinfo', 'FileSaver', 'LocalFileReader'];
    function DesignerController($rootScope, $scope, $q, $routeParams, $interval, $timeout, $location, ItemsService, EventSourceService, FlowService, RuleEngineService, FlowCompiler, ModulesTypesExtensions, prompt, $filter, $modal, Modelfactory, flowchartConstants, module_types, flowinfo, FileSaver, LocalFileReader) {
        var vm = this;

        vm.module_types = module_types;

        var deleteKeyCode = 46;
        var ctrlKeyCode = 17;
        var aKeyCode = 65;
        var cKeyCode = 67;
        var sKeyCode = 83;
        var vKeyCode = 86;
        var xKeyCode = 88;
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
                },
                edgeMouseOver: function () {
                },
                isValidEdge: function (source, destination) {
                    return source.type === flowchartConstants.bottomConnectorType && destination.type === flowchartConstants.topConnectorType;
                },
                edgeAdded: function (edge) {
                },
                nodeRemoved: function (node) {
                },
                edgeRemoved: function (edge) {
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
            if ($rootScope.suspendKeyboardShortcuts) return;

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
            if (evt.keyCode == xKeyCode && (evt.ctrlKey || evt.metaKey)) {
                vm.cutNodes();
                evt.stopPropagation();
                evt.preventDefault();
            }
            if (evt.keyCode == cKeyCode && (evt.ctrlKey || evt.metaKey)) {
                vm.copyNodes();
                evt.stopPropagation();
                evt.preventDefault();
            }
            if (evt.keyCode == vKeyCode && (evt.ctrlKey || evt.metaKey)) {
                vm.pasteNodes();
                evt.stopPropagation();
                evt.preventDefault();
            }
        };

        $rootScope.keyUp = function (evt) {
            if ($rootScope.suspendKeyboardShortcuts) return;

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

        vm.addNode = function (module, x, y, config) {
            if (!module) return;

            var moduleName = module.replace('module-', '');
            var moduleType = $filter('filter')(module_types.all, { uid: moduleName })[0];
            var category = getModuleTypeCategory(moduleType);

            var newNode = {
                module_type_uid: moduleType.uid,
                name : '',
                id: 'N' + (vm.model.next_node_id++).toString(),
                x: x,
                y: y,
                type: category,
                connectors: [],
                module_config: config || {}
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

        vm.copyNodes = function () {
            if (!vm.flowchartselected) return;
            vm.copiedNodes = [];
            var selection = angular.copy(vm.flowchartselected);
            angular.forEach(selection, function (obj) {
                if (obj.id) { // nodes only, ignore edges
                    obj.connectors = [];
                    vm.copiedNodes.push(obj);
                }
            });
        }

        vm.cutNodes = function () {
            vm.copyNodes();
            vm.modelservice.deleteSelected();
        }

        vm.pasteNodes = function () {
            if (!vm.copiedNodes || !vm.copiedNodes.length) return;
            angular.forEach(vm.copiedNodes, function (node) {
                vm.addNode('module-' + node.module_type_uid, node.x + 100, node.y + 40, angular.copy(node.module_config));
            });
        }

        vm.getNodeModuleType = function (node) {
            var moduleTypeUid = node.module_type_uid;
            return $filter('filter')(module_types.all, {uid: moduleTypeUid})[0];
        };

        vm.saveFlow = function () {
            if (vm.currentFlowId === 'untitled') {
                return vm.saveFlowAs();
            } else {
                var deferred = $q.defer();
                vm.saving = true;
                FlowService.saveFlowAs(vm.currentFlowId, vm.model).then(function () {
                    vm.saving = false;
                    console.log('Save complete');
                    vm.justSaved = true;
                    deferred.resolve();
                    $interval(function () { vm.justSaved = false; }, 2000);
                }, function (rej) {
                    deferred.reject(rej);
                });

                return deferred.promise;
            }
        };

        vm.saveFlowAs = function () {
            var deferred = $q.defer();
            prompt({
                title: 'Save flow on server',
                message: 'Please specify the ID of your flow: use alphanumerical characters and underscores only!',
                input: 'true',
                label: 'Flow ID',
            }).then (function (newId) {
                var isValidId = new RegExp(/^\w+$/).test(newId);
                if (!isValidId || newId === 'untitled') {
                    prompt({ title: 'Invalid identifier', message: 'Use alphanumerical characters and underscores only! Example: my_new_flow' });
                    deferred.reject('invalid_id');
                } else {
                    vm.saving = true;
                    FlowService.saveFlowAs(newId, vm.model).then(function () {
                        vm.saving = false;
                        vm.currentFlowId = newId;
                        vm.flowIds = FlowService.getFlowIds();
                        console.log('SaveAs complete');
                        vm.justSaved = true;
                        $interval(function () { vm.justSaved = false; }, 2000);
                        deferred.resolve();
                    }, function (rej) {
                        deferred.reject(rej);
                    });
                }
            }, function (rej) {
                deferred.reject('cancelled');
            });

            return deferred.promise;
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
                message: 'Are you sure you wish to delete this flow: ' + vm.currentFlowId + '?. This cannot be undone! Important: Make sure you unpublish the flow (remove the rules) before deleting it!'
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

            vm.saveFlow().then (function () {
                var result = FlowCompiler.buildFlow(vm.model, vm.currentFlowId);
                vm.lastBuildLogs = result.logs;
                if (!result.error) vm.lastBuildResult = result.rules;
                vm.lastBuildError = result.error;
            });
        };

        vm.publishFlow = function () {
            vm.modelservice.deselectAll();
            vm.lastBuildLogs = [];
            vm.lastBuildResult = [];
            vm.lastBuildError = '';
            vm.activeNodeConfigTab = 1;
            vm.publishRequests = [];
            vm.publishResultClass = '';

            vm.saveFlow().then (function () {
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
            });
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

        vm.sendDebuggerCommand = function () {
            ItemsService.sendCmd(vm.debugItem, vm.debugCommand);
        }

        vm.toggleDebugger = function () {
            vm.debuggerActive = !vm.debuggerActive;

            vm.debuggerEvents = [];
            if (vm.debuggerActive) {
                EventSourceService.registerEventSource(function (event, topicparts, payload) {
                    if (vm.debuggerActive) {
                        $scope.$apply(function () {
                            vm.debuggerEvents.unshift({ topic: event.topic, type: event.type, payload: payload });
                        });
                    }
                })
            } else {
                EventSourceService.closeEventSource();
            }
        }
    }

})();    
