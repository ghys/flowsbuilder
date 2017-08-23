(function() {
    'use strict';

    angular
        .module('app.shared')
        .value('TernDefs', {})
        .directive('modalScriptEditor', ScriptEditorDirective);

    ScriptEditorDirective.$inject = ['$rootScope', '$ocLazyLoad', '$uibModal', '$timeout', '$http', '$filter', 'FlowService', 'RuleEngineService', 'flowchartConstants', 'TernDefs'];
    function ScriptEditorDirective($rootScope, $ocLazyLoad, $uibModal, $timeout, $http, $filter, FlowService, RuleEngineService, flowchartConstants, TernDefs) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            link: link,
            restrict: 'EA',
            scope: {
                ngModel: '=',
                node: '=',
                json: '=',
                readonly: '=',
                autocomplete: '=',
                label: '@',
                dialogTitle: '@',
                buttonStyle: '='
            },
            template: '<a ng-class="{btn: buttonStyle, \'btn-primary\': buttonStyle}" ng-click="openModal()">{{label}}</a>'
        };
        return directive;

        function link(scope, element, attrs) {

            var flow = FlowService.getCurrentFlow();
            var moduleTypes;
            RuleEngineService.getModuleTypes().then(function (mt) {
                moduleTypes = mt;
            });

            function getContextDefinitionAtNode(node, context) {
                if (node !== scope.node && !context[node.id]) {
                    var moduleType = $filter('filter')(moduleTypes.all, { uid: node.module_type_uid })[0];
                    if (moduleType.outputs && moduleType.outputs.length) {
                        context[node.id] = {};
                        context[node.id]['!doc'] = 'The outputs of node ' + node.id;
                        angular.forEach(moduleType.outputs, function (output) {
                            context[node.id][output.name] = {
                                '!doc': output.name + ' - ' + output.description + ' (output of node ' + node.id + ')',
                                '!type': (output.type === 'org.eclipse.smarthome.core.events.Event') ?
                                    'ESHEvent' : (output.type === 'state') ?
                                        'ESHState' : (output.type === 'java.lang.String') ?
                                            'string' : output.type
                            };
                        });
                    }
                }

                var inboundConnector = node.connectors.find(function (c) { return c.type === flowchartConstants.topConnectorType });
                if (inboundConnector) {
                    var inboundEdges = $filter('filter')(flow.edges, function (e) { return e.destination === inboundConnector.id });

                    if (inboundEdges && inboundEdges.length > 0) {
                        var parentNodes = inboundEdges.map(function (e) {
                            return flow.nodes.find(function (n) {
                                return n.connectors.find(function (c) {
                                    return c.id === e.source && c.type === flowchartConstants.bottomConnectorType;
                                });
                            });
                        });

                        angular.forEach(parentNodes, function (parentNode) {
                            getContextDefinitionAtNode(parentNode, context);
                        });
                    }
                }
            }

            function getScriptContextDefinition() {
                var defs = {};
                var ctx = {};

                getContextDefinitionAtNode(scope.node, ctx);
                ctx['!doc'] = "The current context containing the outputs of the parent modules";
                defs.ruleUID = {
                    '!doc': "The UID of the current rule",
                    '!type': "string"
                };

                angular.forEach(Object.keys(ctx), function (m) {
                    if (m !== '!doc') {
                        angular.forEach(Object.keys(ctx[m]), function (key) {
                            defs[key] = ctx[m][key];
                        });
                    }
                });

                defs.ctx = ctx;
                defs['name'] = 'esh-context';
                defs['!define'] = TernDefs.smarthome['!define'];

                scope.defs = $filter('filter')(Object.keys(defs), function (def) {
                    return def !== '!name' && def !== '!define' && def !== '!doc';
                });

                return defs;
            }

            scope.editorOptions = {
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                mode: 'javascript',
                viewportMargin: Infinity,
                height: 800
            };

            scope.editorLoaded = function (editor) {
                scope.editor = editor;

                if (scope.autocomplete) {
                    scope.editor.setOption("extraKeys", {
                        "Ctrl-Space": function (cm) { scope.ternServer.complete(cm); },
                        "Ctrl-Q": function(cm) { scope.ternServer.showDocs(cm); },
                        "'.'": function(cm) {
                            setTimeout(function(){scope.ternServer.complete(cm);}, 100);
                            return CodeMirror.Pass; // tell CodeMirror we didn't handle the key
                        }
                    });
                    scope.editor.on("cursorActivity", function(cm) {
                        scope.ternServer.updateArgHints(cm);
                    });
                }
            }

            scope.openModal = function () {

                scope.code = scope.ngModel;
                if (scope.readonly)
                    scope.editorOptions.readOnly = true;

                if (scope.json) {
                    scope.editorOptions.mode = 'application/json';
                    scope.editorOptions.json = true;
                    scope.code = JSON.stringify(scope.code, null, 4);
                }

                scope.$on('modal.closing', function () {
                    debugger;
                });
                
                $ocLazyLoad.load(['codemirror']).then (function () {

                    if (scope.autocomplete) {
                        scope.ternServer = new CodeMirror.TernServer({
                            defs: [TernDefs.ecmascript, TernDefs.smarthome, getScriptContextDefinition()],
                            ecmaVersion: 5
                        });
                    }

                    $rootScope.suspendKeyboardShortcuts = true;

                    var modalInstance = $uibModal.open({
                        animation: false,
                        size: 'lg',
                        backdrop: 'static',
                        scope: scope,
                        keyboard: false, // don't let the Esc key close the window
                        template: '<div class="modal-header">' +
                                '  <h3 class="modal-title">{{dialogTitle}}</h3>' +
                                '</div>' +
                                '<div class="modal-body">' +
                                '  <div class="modal-script-editor" ui-codemirror="{ onLoad: editorLoaded }" ui-refresh="refreshEditor" ui-codemirror-opts="editorOptions" ng-model="code" />' +
                                '</div>' +
                                '<div class="modal-footer">' +
                                '  <small class="pull-left text-left" ng-if="autocomplete && defs">Objects available for use: <span ng-repeat="def in defs"><code>{{def}}</code>, </span><code>itemRegistry</code>, <code>ir</code>, <code>events</code> (and others)<br /><kbd>Ctrl+Space</kbd>&nbsp;autocompletion suggestions&nbsp;&nbsp;<kbd>Ctrl+Q</kbd>&nbsp;contextual tooltip</small>' +
                                '  <button ng-if="!readonly" class="btn btn-default" type="button" ng-click="$dismiss()">Cancel</button>' +
                                '  <button ng-if="!readonly" class="btn btn-primary" type="button" ng-click="$close(code)">Save</button>' +
                                '  <button ng-if="readonly" class="btn btn-default" type="button" ng-click="$dismiss()">Close</button>' +
                                '</div>'
                    });

                    $timeout(function () {
                        scope.refreshEditor = new Date();
                    });
                    
                    modalInstance.result.then(function (result) {
                        scope.ngModel = result;
                        $rootScope.suspendKeyboardShortcuts = false;
                    });
                });
            };

            if (!TernDefs.ecmascript || !TernDefs.smarthome) {
                $http.get('vendor/cm/addon/tern/ecma5.json').then(function (def) {
                    TernDefs.ecmascript = def.data;
                });
                $http.get('assets/defs/esh-script-scope.json').then(function (def) {
                    TernDefs.smarthome = def.data;
                });
            }
        }
    }
})();
