(function() {
    'use strict';

    angular
        .module('app.shared')
        .directive('modalScriptEditor', ScriptEditorDirective);

    ScriptEditorDirective.$inject = ['$ocLazyLoad', '$uibModal', '$timeout'];
    function ScriptEditorDirective($ocLazyLoad, $uibModal, $timeout) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            link: link,
            restrict: 'EA',
            scope: {
                ngModel: '=',
                json: '=',
                readonly: '=',
                label: '@',
                dialogTitle: '@',
                buttonStyle: '='
            },
            template: '<a ng-class="{btn: buttonStyle, \'btn-primary\': buttonStyle}" ng-click="openModal()">{{label}}</a>'
        };
        return directive;
        
        function link(scope, element, attrs) {
            scope.editorOptions = {
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true,
                mode: 'javascript',
                viewportMargin: Infinity,
                height: 800
            };

            scope.openModal = function () {

                scope.code = scope.ngModel;
                if (scope.readonly)
                    scope.editorOptions.readOnly = true;

                if (scope.json) {
                    scope.editorOptions.mode = 'application/json';
                    scope.editorOptions.json = true;
                    scope.code = JSON.stringify(scope.code, null, 4);
                }
                
                $ocLazyLoad.load([
                    'vendor/cm/lib/codemirror.css',
                    'vendor/cm/lib/codemirror.js',
                    'vendor/cm/theme/rubyblue.css',
                ]).then (function () {
                    $ocLazyLoad.load([
                        'vendor/cm/addon/edit/matchbrackets.js',
                        'vendor/cm/addon/edit/closebrackets.js',
                        'vendor/cm/mode/javascript/javascript.js'
                    ]).then (function () {
                        var modalInstance = $uibModal.open({
                            animation: false,
                            size: 'lg',
                            backdrop: 'static',
                            scope: scope,
                            template: '<div class="modal-header">' +
                                      '  <h3 class="modal-title">{{dialogTitle}}</h3>' +
                                      '</div>' +
                                      '<div class="modal-body">' +
                                      '  <div class="modal-script-editor" ui-codemirror ui-refresh="refreshEditor" ui-codemirror-opts="editorOptions" ng-model="code" />' +
                                      '</div>' +
                                      '<div class="modal-footer">' +
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
                        });
                    });
                });
            };
        }
    }
})();