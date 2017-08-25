(function() {
    'use strict';

    angular
        .module('app.shared')
        .value('TernDefs', {})
        .directive('modalScriptEditor', ScriptEditorDirective);

    ScriptEditorDirective.$inject = ['$rootScope', '$ocLazyLoad', '$uibModal', '$timeout', '$http', '$filter', 'FlowService', 'RuleEngineService', 'ItemsService', 'flowchartConstants', 'TernDefs'];
    function ScriptEditorDirective($rootScope, $ocLazyLoad, $uibModal, $timeout, $http, $filter, FlowService, RuleEngineService, ItemsService, flowchartConstants, TernDefs) {
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

            function ternComplete(file, query) {
                var pos = tern.resolvePos(file, query.end);
                var lit = tern.findExpressionAround(file.ast, null, pos, file.scope, 'Literal');
                if (!lit || !lit.node) return;
                var call = tern.findExpressionAround(file.ast, null, lit.node.start - 2, file.scope);
                if (!call || !call.node) return;
                if (call.node.type !== 'MemberExpression' || !call.node.object && !call.node.property) return;
                if ((call.node.object.name === 'events' && call.node.property.name === 'postUpdate')
                || (call.node.object.name === 'events' && call.node.property.name === 'sendCommand')
                || (call.node.object.name === 'itemRegistry' && call.node.property.name === 'getItem')
                || (call.node.object.name === 'ir' && call.node.property.name === 'getItem')) {
                    console.log('Completing item names!');

                    var before = lit.node.value.slice(0, pos - lit.node.start - 1);
                    var matches = [];
                    angular.forEach($filter('orderBy')(ItemsService.getItems(), 'name'), function (item) {
                        if (item.name.length > before.length && item.name.toLowerCase().indexOf(before.toLowerCase()) >= 0) {
                            if (query.types || query.docs || query.urls || query.origins) {
                                var rec = {
                                    name: JSON.stringify(item.name),
                                    displayName: item.name,
                                    doc: (item.label ? item.label + ' ' : '') + '[' + item.type + ']'
                                };
                                matches.push(rec);
                                if (query.types) rec.type = "string";
                                if (query.origins) rec.origin = item.name;
                            }
                        }
                    });

                    return {
                        start: tern.outputPos(query, file, lit.node.start),
                        end: tern.outputPos(query, file, pos + (file.text.charAt(pos) == file.text.charAt(lit.node.start) ? 1 : 0)),
                        isProperty: false,
                        completions: matches
                    }
                }
            }

            function registerTernPlugin() {
                tern.registerPlugin("smarthome_helper", function(server, options) {
                    server.mod.completeStrings = { maxLen: options && options.maxLength || 15,
                                                seen: Object.create(null) };
                    // server.on("reset", function() {
                    // server.mod.completeStrings.seen = Object.create(null);
                    // });
                    //server.on("postParse", ternPostParse)
                    server.on("completion", ternComplete)
                });
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
                
                $ocLazyLoad.load(['codemirror']).then (function () {

                    registerTernPlugin();

                    if (scope.autocomplete) {
                        scope.ternServer = new CodeMirror.TernServer({
                            defs: [TernDefs.ecmascript, TernDefs.smarthome, getScriptContextDefinition()],
                            plugins: {'smarthome_helper': {}},
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
