(function() {
    'use strict';

    angular
        .module('app.shared')
        .directive('configForm', ConfigFormDirective)
        .directive('daysOfWeekPicker', DaysOfWeekPickerDirective);

    ConfigFormDirective.$inject = ['ItemsService'];
    function ConfigFormDirective(ItemsService) {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            bindToController: true,
            controller: ConfigFormController,
            controllerAs: 'vm',
            link: link,
            restrict: 'EA',
            scope: {
                node: '=',
                moduleType: '='
            },
            templateUrl: 'app/shared/config-form.tpl.html'
        };
        return directive;
        
        function link(scope, element, attrs) {
        }
    }
    /* @ngInject */
    function ConfigFormController () {
        var vm = this;

        vm.configDescriptions = vm.moduleType.configDescriptions;
    }

    function DaysOfWeekToArrayFilter() {
        return function (input) {
            return input;
        }
    }


    DaysOfWeekPickerDirective.$inject = [];
    function DaysOfWeekPickerDirective() {
        // Usage:
        //
        // Creates:
        //
        var directive = {
            link: link,
            restrict: 'EA',
            scope: {
                ngModel: '='
            },
            template: '<div class="btn-group btn-group-justified col-xs-12">' +
                      '  <label class="btn btn-default" style="padding: 2px;" ng-model="day.selected" uib-btn-checkbox ng-repeat="(val,day) in daysOfWeek">{{day.label}}</label>' +
                      '</div>' // + '<pre>{{ngModel | json }}</pre>'
        };
        return directive;
        
        function link(scope, element, attrs) {
            scope.daysOfWeek = {
                'MON': { label: 'Mon' },
                'TUE': { label: 'Tue' },
                'WED': { label: 'Wed' },
                'THU': { label: 'Thu' },
                'FRI': { label: 'Fri' },
                'SAT': { label: 'Sat' },
                'SUN': { label: 'Sun' }
            };

            if (scope.ngModel) {
                angular.forEach(scope.daysOfWeek, function (day, val) {
                    if (scope.ngModel.indexOf(val) >= 0) {
                        day.selected = true;
                    }
                });
            }

            scope.$watch('daysOfWeek', function (dow) {
                var model = [];
                angular.forEach(dow, function (day, val) {
                    if (day.selected) {
                        model.push(val);
                    }
                    scope.ngModel = model;
                });
            }, true);
            
        }
    }
})();