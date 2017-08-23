(function () {
    'use strict';

    angular.module('app.shared', [
        'ui.codemirror',
        'flowchart'
    ])
    .directive('enforceEmpty', function () {
        return {
            restrict: 'A',
            require: '?ngModel',
            link: function (scope, element, attr, ngModel) {
                if (ngModel) {
                    var convertToModel = function (value) {
                        return (!value) ? '' : value;
                    };
                    ngModel.$parsers.push(convertToModel);
                }
            }
        };
    });
})();